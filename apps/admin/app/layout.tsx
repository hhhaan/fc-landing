import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { QueryProvider } from '@/shared/lib/QueryProvider';
import './globals.css';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'First Crack · Ops Console',
    description: 'Business operations dashboard for First Crack',
    icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
            <body className="min-h-full bg-[var(--bg)] text-[var(--fg)] antialiased">
                <QueryProvider>{children}</QueryProvider>
            </body>
        </html>
    );
}
