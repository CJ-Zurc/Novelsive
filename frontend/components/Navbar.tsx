"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get("/api/user/profile");
                setUser(res.data.user);
            } catch (err) {
                // If not logged in, user remains null
            }
        };
        fetchUser();
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout");
            window.location.href = "/login";
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo & Main Links */}
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="text-2xl font-bold text-blue-600">
                            Novelsive
                        </Link>
                        
                        <div className="hidden md:flex space-x-6">
                            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium">Home</Link>
                            
                            <Link href="/browse" className="text-gray-700 hover:text-blue-600 font-medium">Top Ranks</Link>
                            
                            {user && (
                                <Link href="/my-novels" className="text-gray-700 hover:text-blue-600 font-medium">My Novels</Link>
                            )}

                            {user?.role === "ADMIN" && (
                                <Link href="/admin" className="text-gray-700 hover:text-blue-600 font-medium">Dashboard</Link>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-8 hidden md:block">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="Search by title or author..."
                                className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </form>
                    </div>

                    {/* Right Side: Auth / Profile Avatar */}
                    <div className="flex items-center">
                        {user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center focus:outline-none"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors">
                                        {user.profile_image ? (
                                            <img src={user.profile_image} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            user.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                </button>

                                {/* Dropdown */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5">
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <p className="text-sm text-gray-500">Signed in as</p>
                                            <p className="text-sm font-medium text-gray-900 truncate">{user.username}</p>
                                        </div>
                                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setDropdownOpen(false)}>
                                            Account Profile
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 font-medium"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-x-4 hidden md:flex">
                                <Link href="/login" className="text-gray-700 hover:text-blue-600 font-medium px-3 py-2">
                                    Sign In
                                </Link>
                                <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-full transition-colors">
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
