"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";

interface Slide {
    content: string;
}

interface Chapter {
    id: number;
    title: string;
    status: string;
    order_index: number;
    created_at: string;
    paragraph_blocks: { id: number; content: string; block_index: number }[];
    reviews: { action: string; rejection_reason: string | null; reviewed_at: string }[];
}

export default function WriteChapterPage() {
    const params = useParams();
    const novelId = params.id as string;

    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
    const [expandedRejection, setExpandedRejection] = useState<number | null>(null);

    const [title, setTitle] = useState("");
    const [slides, setSlides] = useState<Slide[]>([{ content: "" }]);
    const [saving, setSaving] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");

    const lastSavedRef = useRef({ title: "", slides: JSON.stringify([{ content: "" }]) });

    const fetchChapters = useCallback(async () => {
        try {
            const res = await axios.get(`/api/novels/${novelId}/chapters`);
            setChapters(res.data.chapters);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [novelId]);

    useEffect(() => { fetchChapters(); }, [fetchChapters]);

    // Auto-save every 30s if changes detected
    useEffect(() => {
        const interval = setInterval(async () => {
            const currentSlides = JSON.stringify(slides);
            if (!title.trim() || slides.every(s => !s.content.trim())) return;
            if (title === lastSavedRef.current.title && currentSlides === lastSavedRef.current.slides) return;

            setAutoSaveStatus("Auto-saving draft...");
            try {
                const slideContents = slides.map(s => s.content);
                if (editingChapterId) {
                    await axios.patch(`/api/chapters/${editingChapterId}`, { title, slides: slideContents });
                } else {
                    const res = await axios.post(`/api/novels/${novelId}/chapters`, { title, slides: slideContents });
                    if (res.data.chapter?.id) setEditingChapterId(res.data.chapter.id);
                }
                lastSavedRef.current = { title, slides: currentSlides };
                fetchChapters();
                setAutoSaveStatus(`Draft auto-saved at ${new Date().toLocaleTimeString()}`);
            } catch {
                setAutoSaveStatus("Auto-save failed.");
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [title, slides, editingChapterId, novelId, fetchChapters]);

    const handleAddSlide = () => {
        setSlides(prev => [...prev, { content: "" }]);
    };

    const handleRemoveSlide = (index: number) => {
        if (slides.length === 1) return;
        setSlides(prev => prev.filter((_, i) => i !== index));
    };

    const handleSlideChange = (index: number, value: string) => {
        setSlides(prev => prev.map((s, i) => i === index ? { ...s, content: value } : s));
    };

    const handleSaveDraft = async () => {
        if (!title.trim() || slides.every(s => !s.content.trim())) {
            Swal.fire({ icon: "warning", title: "Incomplete", text: "Title and at least one slide with content are required.", confirmButtonColor: "#4F46E5" });
            return;
        }
        setSaving(true);
        try {
            const slideContents = slides.map(s => s.content);
            if (editingChapterId) {
                await axios.patch(`/api/chapters/${editingChapterId}`, { title, slides: slideContents });
            } else {
                const res = await axios.post(`/api/novels/${novelId}/chapters`, { title, slides: slideContents });
                if (res.data.chapter?.id) setEditingChapterId(res.data.chapter.id);
            }
            lastSavedRef.current = { title, slides: JSON.stringify(slides) };
            Swal.fire({ icon: "success", title: "Saved!", text: "Chapter draft saved successfully.", timer: 2000, showConfirmButton: false });
            clearEditor();
            fetchChapters();
        } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Failed to save chapter draft.", confirmButtonColor: "#4F46E5" });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async (chapterId: number) => {
        const result = await Swal.fire({
            title: "Submit for Review?",
            text: "Each slide will be analyzed for emotional content. The chapter will then enter the admin review queue.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#10B981",
            cancelButtonColor: "#EF4444",
            confirmButtonText: "Yes, submit!"
        });
        if (!result.isConfirmed) return;

        Swal.fire({ title: "Publishing & NLP Processing...", text: "Analyzing emotions slide by slide. This may take a moment.", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            await axios.post(`/api/chapters/${chapterId}/publish`);
            await axios.post(`/api/chapters/${chapterId}/process-nlp`);
            Swal.fire({ icon: "success", title: "Submitted!", text: "Chapter submitted for review and NLP analysis complete.", timer: 3000, showConfirmButton: false });
            fetchChapters();
        } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Chapter submitted, but NLP analysis encountered an issue.", confirmButtonColor: "#4F46E5" });
            fetchChapters();
        }
    };

    const startEditing = (chapter: Chapter) => {
        setEditingChapterId(chapter.id);
        setTitle(chapter.title);
        // Restore slides from paragraph_blocks or fall back to splitting content
        if (chapter.paragraph_blocks && chapter.paragraph_blocks.length > 0) {
            setSlides(chapter.paragraph_blocks.map(pb => ({ content: pb.content })));
        } else {
            setSlides([{ content: "" }]);
        }
        lastSavedRef.current = { title: chapter.title, slides: JSON.stringify(chapter.paragraph_blocks?.map(pb => ({ content: pb.content })) ?? [{ content: "" }]) };
        setAutoSaveStatus("Loaded chapter for editing");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearEditor = () => {
        setEditingChapterId(null);
        setTitle("");
        setSlides([{ content: "" }]);
        lastSavedRef.current = { title: "", slides: JSON.stringify([{ content: "" }]) };
        setAutoSaveStatus("");
    };

    const wordCount = slides.reduce((acc, s) => acc + s.content.trim().split(/\s+/).filter(Boolean).length, 0);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "PUBLISHED": return "bg-emerald-100 text-emerald-700";
            case "PENDING_REVIEW": return "bg-amber-100 text-amber-700";
            case "REJECTED": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500 font-medium text-sm">Loading your writing studio...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
            <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-6">

                {/* ── LEFT PANEL: Chapter List ── */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-600 to-purple-600">
                            <h2 className="font-bold text-white text-lg">Chapters</h2>
                            <p className="text-indigo-200 text-xs mt-1">{chapters.length} chapter{chapters.length !== 1 ? "s" : ""} total</p>
                        </div>

                        <div className="p-3 max-h-[70vh] overflow-y-auto">
                            {chapters.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                    <p className="text-sm font-medium">No chapters yet</p>
                                    <p className="text-xs mt-1">Start writing your first chapter</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {chapters.map(ch => {
                                        const isRejected = ch.status === "REJECTED";
                                        const rejectionInfo = ch.reviews?.[0];
                                        return (
                                            <li key={ch.id} className={`rounded-xl border transition-all ${editingChapterId === ch.id ? "border-indigo-300 bg-indigo-50/60 shadow-sm" : "border-gray-100 bg-gray-50/50 hover:border-gray-200"}`}>
                                                {/* Chapter header — clickable */}
                                                <button
                                                    onClick={() => (ch.status === "DRAFT" || ch.status === "REJECTED") ? startEditing(ch) : null}
                                                    className={`w-full text-left p-3 ${(ch.status === "DRAFT" || ch.status === "REJECTED") ? "cursor-pointer" : "cursor-default"}`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 text-sm truncate">Ch. {ch.order_index}: {ch.title}</p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusStyle(ch.status)}`}>
                                                                    {ch.status.replace("_", " ")}
                                                                </span>
                                                                {ch.paragraph_blocks?.length > 0 && (
                                                                    <span className="text-[10px] text-gray-400">{ch.paragraph_blocks.length} slide{ch.paragraph_blocks.length !== 1 ? "s" : ""}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {ch.status === "DRAFT" && (
                                                            <span className="shrink-0 text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-lg">Edit</span>
                                                        )}
                                                        {ch.status === "REJECTED" && (
                                                            <span className="shrink-0 text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-lg">Fix</span>
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Rejection reason expandable */}
                                                {isRejected && rejectionInfo && (
                                                    <div className="border-t border-red-100">
                                                        <button
                                                            onClick={() => setExpandedRejection(expandedRejection === ch.id ? null : ch.id)}
                                                            className="w-full text-left px-3 py-2 text-xs text-red-600 font-semibold flex items-center justify-between hover:bg-red-50/50 transition"
                                                        >
                                                            <span>⚠ View rejection reason</span>
                                                            <svg className={`w-3 h-3 transition-transform ${expandedRejection === ch.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                        {expandedRejection === ch.id && (
                                                            <div className="px-3 pb-3">
                                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                                    <p className="text-xs text-red-700 leading-relaxed whitespace-pre-line">
                                                                        {rejectionInfo.rejection_reason || "No reason provided."}
                                                                    </p>
                                                                    <p className="text-[10px] text-red-400 mt-2">
                                                                        Rejected on {new Date(rejectionInfo.reviewed_at).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Publish button for draft chapters */}
                                                {ch.status === "DRAFT" && (
                                                    <div className="px-3 pb-3">
                                                        <button
                                                            onClick={() => handlePublish(ch.id)}
                                                            className="w-full text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 font-bold transition"
                                                        >
                                                            Submit for Review →
                                                        </button>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100">
                            <button
                                onClick={clearEditor}
                                className="w-full text-sm bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                New Chapter
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PANEL: Slide Editor ── */}
                <div className="flex-1 min-w-0">
                    {/* Editor header */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h2 className="font-extrabold text-2xl text-gray-900">
                                    {editingChapterId ? "✏️ Editing Chapter Draft" : "📝 Write New Chapter"}
                                </h2>
                                {autoSaveStatus && (
                                    <p className="text-xs text-indigo-600 mt-1 font-semibold">{autoSaveStatus}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400 font-medium">{wordCount.toLocaleString()} words · {slides.length} slide{slides.length !== 1 ? "s" : ""}</span>
                                {editingChapterId && (
                                    <button onClick={clearEditor} className="text-xs text-gray-500 hover:text-gray-700 font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Chapter title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Chapter Title</label>
                            <input
                                type="text"
                                className="w-full border border-gray-200 px-4 py-3 rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-gray-900 font-medium transition text-sm"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g., The Gathering Storm"
                            />
                        </div>
                    </div>

                    {/* Slides */}
                    <div className="space-y-4">
                        {slides.map((slide, index) => (
                            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:border-indigo-200">
                                {/* Slide header */}
                                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-indigo-50/30 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-extrabold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                                            Slide {index + 1}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {slide.content.trim().split(/\s+/).filter(Boolean).length} words
                                        </span>
                                    </div>
                                    {slides.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveSlide(index)}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                                            title="Remove this slide"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Remove
                                        </button>
                                    )}
                                </div>

                                {/* Slide content area */}
                                <textarea
                                    value={slide.content}
                                    onChange={e => handleSlideChange(index, e.target.value)}
                                    placeholder={`Write the content of Slide ${index + 1} here...`}
                                    className="w-full px-5 py-4 min-h-[200px] resize-none outline-none text-gray-800 text-sm leading-relaxed bg-white placeholder:text-gray-300 font-serif"
                                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                                />
                            </div>
                        ))}

                        {/* Add Slide button */}
                        <button
                            onClick={handleAddSlide}
                            className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-500 rounded-2xl font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Slide {slides.length + 1}
                        </button>
                    </div>

                    {/* Save button */}
                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    {editingChapterId ? "Save Changes" : "Save Draft"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
