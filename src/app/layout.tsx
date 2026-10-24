import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ActiveUserProvider, Header } from "@/components/layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniFix",
  description:
    "Report what's broken on campus in plain language. AI routes it, duplicates merge, and every report has a visible status.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ActiveUserProvider>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        </ActiveUserProvider>
      </body>
    </html>
  );
}
