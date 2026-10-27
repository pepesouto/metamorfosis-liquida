import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LevaControls from "@/components/leva-controls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mouse Effects | Creative Experiments",
  description: "Collection of creative mouse interaction effects",
  icons: {
    icon: "/logo-favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a]`}
      >
        {children}
        <LevaControls />
      </body>
    </html>
  );
}
