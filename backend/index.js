require('dotenv').config();
const express = require("express");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json({ limit: "50mb" }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, methods: ["GET", "POST"], credentials: true },
});

app.get("/", (req,res)=>{
        res.send("Backend running");
});

// Socket.IO: map users to rooms by userId provided in handshake auth
io.on("connection", (socket) => {
    try {
        const cookieHeader = socket.request.headers.cookie || "";
        const cookies = Object.fromEntries(cookieHeader.split("; ").map(c => c.split("=")).filter(Boolean));
        const token = cookies['token'];
        if (!token) {
            console.log(`Socket ${socket.id} missing token, disconnecting`);
            socket.disconnect(true);
            return;
        }
        // Verify JWT
        const secret = process.env.JWT_SECRET || "novelsive_secret_change_this_later";
        let payload;
        try {
            payload = jwt.verify(token, secret);
        } catch (err) {
            console.log(`Socket ${socket.id} invalid token, disconnecting`);
            socket.disconnect(true);
            return;
        }
        const userId = payload?.sub || payload?.id || payload?.userId || null;
        if (!userId) {
            console.log(`Socket ${socket.id} token missing user id, disconnecting`);
            socket.disconnect(true);
            return;
        }
        const room = `user:${userId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
    } catch (err) {
        console.error('Socket connection error', err);
        socket.disconnect(true);
    }
});

// Simple notify endpoint: expects { userId, type, payload }
// Simple in-memory rate limiter for /api/notify
const notifyRateMap = new Map(); // key -> { count, windowStart }
const NOTIFY_LIMIT = parseInt(process.env.NOTIFY_RATE_LIMIT || "60", 10); // default 60 requests
const NOTIFY_WINDOW_MS = parseInt(process.env.NOTIFY_WINDOW_MS || "60000", 10); // default 60s

app.post("/api/notify", (req, res) => {
        try {
                const { userId, type, payload } = req.body;
                const notifySecret = req.headers['x-notify-secret'] || req.headers['x-api-key'];
                if (!process.env.NOTIFY_SECRET) {
                    console.warn('NOTIFY_SECRET not configured; /api/notify will reject requests without header');
                }
                if (!notifySecret || notifySecret !== process.env.NOTIFY_SECRET) {
                    return res.status(403).json({ error: 'invalid notify secret' });
                }
                if (!userId || !type) return res.status(400).json({ error: "userId and type required" });

                // Rate limiting per notifySecret (server identity) to avoid spam
                const key = notifySecret || req.ip;
                const now = Date.now();
                const record = notifyRateMap.get(key) || { count: 0, windowStart: now };
                if (now - record.windowStart > NOTIFY_WINDOW_MS) {
                    // reset window
                    record.count = 0;
                    record.windowStart = now;
                }
                record.count += 1;
                notifyRateMap.set(key, record);
                if (record.count > NOTIFY_LIMIT) {
                    return res.status(429).json({ error: 'rate limit exceeded' });
                }

                const room = `user:${userId}`;
                io.to(room).emit("notification", { type, payload, message: payload?.rejection_title || null });
                return res.json({ ok: true });
        } catch (err) {
                console.error("/api/notify error", err);
                return res.status(500).json({ error: "notify failed" });
        }
});

// Helper to chunk text
function chunkText(text, maxWords = 200) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = "";
    let currentWordCount = 0;

    for (let sentence of sentences) {
        const wordCount = sentence.trim().split(/\s+/).length;
        if (currentWordCount + wordCount > maxWords && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
            currentWordCount = wordCount;
        } else {
            currentChunk += " " + sentence;
            currentWordCount += wordCount;
        }
    }
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

app.post("/api/nlp/analyze-chapter", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Text is required" });

        const chunks = chunkText(text, 200);
        const results = [];

        for (let i = 0; i < chunks.length; i++) {
            let emotion = "NEUTRAL";
            let confidence = 1.0;
            try {
                // Call python NLP service
                // Using a fallback for now if the python service is unavailable
                const response = await axios.post("http://localhost:8000/analyze", { text: chunks[i] });
                emotion = response.data.emotion?.toUpperCase() || "NEUTRAL";
                confidence = response.data.confidence || 1.0;
            } catch (err) {
                // If NLP service is down, mock it
                const emotions = ["JOY", "SADNESS", "ANGER", "FEAR", "SURPRISE", "LOVE", "DISGUST", "NEUTRAL"];
                emotion = emotions[Math.floor(Math.random() * emotions.length)];
                console.log(`[Mock NLP] Chunk ${i} assigned: ${emotion}`);
            }

            results.push({
                block_index: i,
                content: chunks[i],
                word_count: chunks[i].split(/\s+/).length,
                emotion_label: emotion,
                confidence_score: confidence
            });
        }

        res.json({ blocks: results });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "NLP processing failed" });
    }
});

server.listen(5000, ()=>{
    console.log("Server running on port 5000");
});