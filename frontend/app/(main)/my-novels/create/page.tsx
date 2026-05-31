"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
            <h1 className="text-3xl font-bold mb-8">Create New Novel</h1>
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-6 text-sm">{error}</div>}

                <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">Title</label>
                    <input type="text" required className="w-full px-3 py-2 border rounded"
                        value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 font-bold mb-2">Synopsis</label>
                    <textarea required rows={5} className="w-full px-3 py-2 border rounded"
                        value={formData.synopsis} onChange={e => setFormData({...formData, synopsis: e.target.value})} />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Cover Image URL</label>
                        <input type="url" required className="w-full px-3 py-2 border rounded"
                            value={formData.cover_image} onChange={e => setFormData({...formData, cover_image: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Title Image URL</label>
                        <input type="url" required className="w-full px-3 py-2 border rounded"
                            value={formData.title_image} onChange={e => setFormData({...formData, title_image: e.target.value})} />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 font-bold mb-2">Genres</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_GENRES.map(genre => (
                            <button
                                key={genre}
                                type="button"
                                onClick={() => handleGenreToggle(genre)}
                                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                                    formData.genres.includes(genre) 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                        <span className="text-gray-700 font-bold">Contains Mature Content (18+)</span>
                    </label>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                    Mature novels are hidden from the public feed until review.
                </p>

                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                    <button type="submit" disabled={submitting || formData.genres.length === 0} 
                        className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
                        {submitting ? "Creating..." : "Create Novel"}
                    </button>
                </div>
            </form>
        </div>
    );
}
