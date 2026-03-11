import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getServerLanguage } from "@/lib/i18n/server";
import { NotificationToastHost } from "@/components/notification-toast-host";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Financial Tracker and Analysis",
  description: "Track spending, budgets, savings, and financial performance.",
};

export default async function RootLayout({ children }) {
  const language = await getServerLanguage();

  return (
    <html lang={language}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <NotificationToastHost />
      </body>
    </html>
  );
}
