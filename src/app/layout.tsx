import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Removed as it caused 'Module not found' - ensure 'geist' package includes it if needed.
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

// The imported GeistSans object contains the variable name directly.
// No need to call it as a function.

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
      {/* Apply the font variable directly to the body class */}
      {/* Removed GeistMono.variable as the import failed */}
      <body className={`${GeistSans.variable} antialiased font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
