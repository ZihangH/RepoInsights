import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// The imported objects `GeistSans` and `GeistMono` contain the font configuration,
// including the CSS variable name. We don't call them as functions.

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
      {/* Apply the font variables directly to the body class */}
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
