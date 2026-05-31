"use client";

import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type Notification = {
  type: string;
  payload: any;
  message?: string;
};

export default function NotificationSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [note, setNote] = useState<Notification | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const s = io(backend, { withCredentials: true });
        s.on("connect", () => {
          console.debug("notification socket connected", s.id);
        });
        s.on("notification", (payload: Notification) => {
          if (!mounted) return;
          setNote(payload);
          // auto-clear after 8s
          setTimeout(() => setNote(null), 8000);
        });
        setSocket(s);
      } catch (err) {
        console.error("Notification socket init failed", err);
      }
    }
    init();
    return () => {
      mounted = false;
      socket?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!note) return null;

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
      <div style={{ background: "#111827", color: "#fff", padding: "12px 16px", borderRadius: 8, boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
        <strong style={{ display: "block", marginBottom: 6 }}>{note.type.replace(/_/g, " ")}</strong>
        <div style={{ fontSize: 13 }}>{note.payload?.rejection_title || note.message || "You have a new notification"}</div>
      </div>
    </div>
  );
}
