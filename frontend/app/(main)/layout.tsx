import Navbar from "@/components/Navbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-shell min-h-screen flex flex-col text-slate-100">
            <Navbar />
            <main style={{ flex: 1 }}>
                {children}
            </main>
        </div>
    );
}
