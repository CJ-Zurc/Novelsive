"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import audioManager from "@/lib/audio";

export default function ImmersiveReaderPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const novelId = params.novelId as string;
    const chapterId = params.chapterId as string;
    const initialParagraph = parseInt(searchParams.get("p") || "0");

    const [chapter, setChapter] = useState<any>(null);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [currentSlide, setCurrentSlide] = useState(initialParagraph);
    const [loading, setLoading] = useState(true);
    
    // UI states
    const [ambientColor, setAmbientColor] = useState("transparent");
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [audioEnabled, setAudioEnabled] = useState(true);

    // Audio references
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartXRef = useRef(0);

    useEffect(() => {
        const fetchChapter = async () => {
            try {
                const res = await axios.get(`/api/chapters/${chapterId}/read`);
                setChapter(res.data.chapter);
                setBlocks(res.data.blocks);
                
                // Preload all audio assets for emotions
                const audioAssets = [
                    "/audio/joy.mp3",
                    "/audio/anger.mp3",
                    "/audio/sadness.mp3",
                    "/audio/fear.mp3",
                    "/audio/surprise.mp3",
                    "/audio/love.mp3",
                ];
                audioAssets.forEach(src => audioManager.preload(src));
                
                // Fetch comments
                const commRes = await axios.get(`/api/chapters/${chapterId}/comments`);
                setComments(commRes.data.comments);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchChapter();
    }, [chapterId]);

    // Save Reading History on slide change
    useEffect(() => {
        if (!loading && blocks.length > 0) {
            axios.post("/api/reading-history", {
                novel_id: parseInt(novelId),
                chapter_id: parseInt(chapterId),
                paragraph_index: currentSlide
            }).catch(() => {}); // ignore if not logged in
        }
    }, [currentSlide, loading, blocks, novelId, chapterId]);

    // Emotion / Audio engine
    useEffect(() => {
        if (loading || blocks.length === 0 || !audioEnabled) return;

        // Clear existing timer
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Reset tint initially when moving slides
        setAmbientColor("transparent");

        // Fade out existing audio over 3s when sliding
        audioManager.stop(3000);

        const emotion = blocks[currentSlide]?.emotion?.emotion_label || "NEUTRAL";
        
        // 5-second dwell timer
        timerRef.current = setTimeout(() => {
            playEnvironment(emotion);
        }, 5000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            // Ensure any playing ambient audio is stopped when unmounting
            audioManager.stop(3000);
        };
    }, [currentSlide, loading, blocks, audioEnabled]);

    const playEnvironment = (emotion: string) => {
        const emo = emotion.toUpperCase();
        
        // Handle Tints
        if (emo === "ANGER") {
            setAmbientColor("rgba(255, 0, 0, 0.06)");
        } else if (emo === "DISGUST") {
            setAmbientColor("rgba(0, 255, 0, 0.04)");
        }
        
        // Handle Audio
        const audioMap: Record<string, string> = {
            "JOY": "/audio/joy.mp3",
            "ANGER": "/audio/anger.mp3",
            "SADNESS": "/audio/sadness.mp3",
            "FEAR": "/audio/fear.mp3",
            "SURPRISE": "/audio/surprise.mp3",
            "LOVE": "/audio/love.mp3",
        };

        if (audioMap[emo]) {
            audioManager.transitionTo(audioMap[emo], { fadeOutMs: 3000, fadeInMs: 1200 });
        } else {
            // Fade out if moving to neutral/tint
            audioManager.stop(3000);
        }
    };

    // audioManager handles transitions, fade and cache-busting

    const handlePrev = () => {
        if (currentSlide > 0) setCurrentSlide(s => s - 1);
    };

    const handleNext = () => {
        if (currentSlide < blocks.length - 1) setCurrentSlide(s => s + 1);
    };

    // Keyboard navigation (arrow keys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                handlePrev();
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                handleNext();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentSlide, blocks]);

    // Touch/Swipe support
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeThreshold = 50; // minimum distance to trigger swipe

        if (touchStartXRef.current - touchEndX > swipeThreshold) {
            // Swiped left → next
            handleNext();
        } else if (touchEndX - touchStartXRef.current > swipeThreshold) {
            // Swiped right → prev
            handlePrev();
        }
    };

    const postComment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post(`/api/chapters/${chapterId}/comments`, { content: newComment });
            setComments([res.data.comment, ...comments]);
            setNewComment("");
        } catch (err) {
            alert("Failed to post comment. Ensure you are logged in.");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Immersive Reader...</div>;
    if (!chapter) return <div className="p-10 text-center text-red-500">Chapter not found.</div>;

    return (
        <div 
            className="min-h-screen transition-colors duration-1000 ease-in-out relative text-slate-100" 
            style={{ backgroundColor: ambientColor || "#071024" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href={`/novel/${novelId}`} className="text-indigo-300 hover:underline font-medium">
                        ← Back to Novel
                    </Link>
                    <span className="text-slate-600">|</span>
                    <h1 className="font-bold text-slate-100 truncate max-w-xs md:max-w-md">{chapter.title}</h1>
                </div>
                <button 
                    onClick={() => { setAudioEnabled(!audioEnabled); audioManager.setEnabled(!audioEnabled); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${audioEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                    {audioEnabled ? "🔊 Ambient: ON" : "🔇 Ambient: OFF"}
                </button>
            </header>

            {/* Paragraph Slider */}
            <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
                
                {blocks.length === 0 ? (
                    <div className="text-gray-500 text-center">
                        <p className="mb-4">This chapter has not been processed for immersive reading yet.</p>
                        <p className="whitespace-pre-line text-left bg-white p-6 rounded shadow">{chapter.content}</p>
                    </div>
                ) : (
                    <div className="relative w-full">
                        {/* Navigation Arrows */}
                        <button 
                            onClick={handlePrev} 
                            disabled={currentSlide === 0}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 md:-ml-20 p-4 text-gray-400 hover:text-blue-600 disabled:opacity-20 transition"
                            aria-label="Previous paragraph"
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        
                        <div className="bg-slate-900/80 p-8 md:p-12 rounded-2xl shadow-xl text-lg md:text-2xl leading-relaxed text-slate-100 min-h-[300px] flex items-center justify-center transition-all duration-500">
                            <p className="transition-opacity duration-300">{blocks[currentSlide]?.content}</p>
                        </div>

                        <button 
                            onClick={handleNext} 
                            disabled={currentSlide === blocks.length - 1}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12 md:-mr-20 p-4 text-gray-400 hover:text-blue-600 disabled:opacity-20 transition"
                            aria-label="Next paragraph"
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>

                        <div className="text-center mt-6 text-sm font-bold text-gray-400">
                            {currentSlide + 1} / {blocks.length} — Use ← → arrows or swipe to navigate
                        </div>
                    </div>
                )}
            </div>

            {/* Comments Section */}
            <div className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-200 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Discussion</h3>
                
                <form onSubmit={postComment} className="mb-8">
                    <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="What are your thoughts on this chapter?"
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-24"
                        required
                    />
                    <div className="flex justify-end mt-2">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                            Post Comment
                        </button>
                    </div>
                </form>

                <div className="space-y-6">
                    {comments.length === 0 ? <p className="text-gray-500 text-center italic">No comments yet. Be the first to share your thoughts!</p> : null}
                    {comments.map((c: any) => (
                        <div key={c.id} className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 shrink-0 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                                {c.user.profile_image ? <img src={c.user.profile_image} alt="User" /> : c.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-4 flex-grow">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-gray-900">{c.user.username}</h4>
                                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{c.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
