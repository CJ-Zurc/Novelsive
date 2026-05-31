"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function HomePage() {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const res = await axios.get(`/api/home`);
				setData(res.data);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	const renderList = (title: string, items: any[]) => (
		<section className="mb-8">
			<h2 className="text-2xl font-bold mb-4">{title}</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
				{items.map((n: any) => (
					<Link key={n.id} href={`/novel/${n.id}`} className="block bg-white p-3 rounded shadow hover:shadow-lg transition">
						<img src={n.cover_image} alt={n.title} className="w-full h-40 object-cover rounded mb-2" />
						<div className="text-sm font-bold truncate">{n.title}</div>
						<div className="text-xs text-gray-500">By {n.author?.username}</div>
						<div className="text-xs text-yellow-500">{(n.averageRating || 0).toFixed(1)} ★</div>
					</Link>
				))}
			</div>
		</section>
	);

	return (
		<div className="max-w-6xl mx-auto p-6">
			<h1 className="text-4xl font-extrabold mb-6">Welcome to Novelsive</h1>
			{loading && <div>Loading recommendations...</div>}

			{!loading && data ? (
				<>
					{data.history && data.history.length > 0 ? (
						<section className="mb-8">
							<h2 className="text-2xl font-bold mb-4">Continue Reading</h2>
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
								{data.history.map((h: any) => (
									<Link key={h.novel.id} href={`/novel/${h.novel.id}`} className="block bg-white p-3 rounded shadow hover:shadow-lg transition">
										<img src={h.novel.cover_image} alt={h.novel.title} className="w-full h-40 object-cover rounded mb-2" />
										<div className="text-sm font-bold truncate">{h.novel.title}</div>
										<div className="text-xs text-gray-500">By {h.novel.author?.username}</div>
										<div className="text-xs text-gray-400">Chapter {h.chapter?.order_index}</div>
									</Link>
								))}
							</div>
						</section>
					) : null}

					{data.topViewed ? renderList("Top Viewed", data.topViewed) : null}
					{data.newlyUpdated ? renderList("Newly Updated", data.newlyUpdated) : null}
					{data.topRated ? renderList("Top Rated", data.topRated) : null}
				</>
			) : null}
		</div>
	);
}

