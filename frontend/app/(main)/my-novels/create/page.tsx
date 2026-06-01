"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const AVAILABLE_GENRES = ["Fantasy", "Romance", "Sci-Fi", "Drama", "Action", "Mystery", "Horror", "Comedy"];

export default function CreateNovelPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        synopsis: "",
        cover_image: "",
        title_image: "",
        genres: [] as string[],
        is_mature: false
    });

    const handleGenreToggle = (genre: string) => {
        setFormData(prev => ({
            ...prev,
            genres: prev.genres.includes(genre)
                ? prev.genres.filter(g => g !== genre)
                : [...prev.genres, genre]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const res = await axios.post("/api/novels", formData);
            router.push(`/my-novels/${res.data.novel.id}/write`);
        } catch (err: any) {
            setError(err.response?.data?.message || "Error creating novel");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Create New Novel</h1>
                <p className="text-slate-400 text-sm mt-1">Start a new story and send it into your writing queue.</p>
            </div>
            
            <Card className="border-slate-800 bg-slate-950/80">
                <CardContent className="p-6">
                {error && <div className="bg-rose-950/40 text-rose-400 p-3 rounded mb-6 text-sm">{error}</div>}

                <div className="mb-4">
                    <label className="block text-slate-200 font-bold mb-2">Title</label>
                    <Input type="text" required
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="mb-4">
                    <label className="block text-slate-200 font-bold mb-2">Synopsis</label>
                    <textarea required rows={5} className="w-full px-3 py-2 border rounded-lg border-slate-800 bg-slate-900 text-slate-100"
                        value={formData.synopsis} onChange={e => setFormData({...formData, synopsis: e.target.value})} />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-200 font-bold mb-2">Cover Image URL</label>
                        <Input type="url" required
                            value={formData.cover_image} onChange={e => setFormData({...formData, cover_image: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-slate-200 font-bold mb-2">Title Image URL</label>
                        <Input type="url" required
                            value={formData.title_image} onChange={e => setFormData({...formData, title_image: e.target.value})} />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-slate-200 font-bold mb-2">Genres</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_GENRES.map(genre => (
                            <button
                                key={genre}
                                type="button"
                                onClick={() => handleGenreToggle(genre)}
                                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                                    formData.genres.includes(genre) 
                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900'
                                }`}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" className="form-checkbox h-5 w-5 text-red-600"
                            checked={formData.is_mature} onChange={e => setFormData({...formData, is_mature: e.target.checked})} />
                        <span className="text-slate-200 font-bold">Contains Mature Content (18+)</span>
                    </label>
                </div>

                <p className="text-sm text-slate-400 mb-6">
                    Mature novels are hidden from the public feed until review.
                </p>

                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 text-slate-400 font-medium">Cancel</button>
                    <Button type="submit" disabled={submitting || formData.genres.length === 0}>
                        {submitting ? "Creating..." : "Create Novel"}
                    </Button>
                </div>
                </CardContent>
            </Card>
        </div>
    );
}
