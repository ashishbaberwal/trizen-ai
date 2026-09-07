import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-seravek",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FrameFlow — Photo delivery for photography teams",
    template: "%s · FrameFlow",
  },
  description:
    "Upload together, curate fast, and deliver private, PIN-protected galleries your clients will love.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <ThemeProvider>{children}</ThemeProvider>
          <Toaster position="bottom-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
