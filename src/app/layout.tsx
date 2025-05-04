import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Use correct import for Geist Sans
import { GeistMono } from 'geist/font/mono'; // Use correct import for Geist Mono
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const geistSans = GeistSans({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = GeistMono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Repo Insights',
  description: 'Get insights into GitHub repository contributors',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
