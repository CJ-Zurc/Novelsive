import "./globals.css";
import NotificationSocket from "@/components/NotificationSocket";

export const metadata = {
    title: 'Novelsive',
    description: 'A novel reading platform',
}

export default function RootLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {children}
                <NotificationSocket />
            </body>
        </html>
    )
}