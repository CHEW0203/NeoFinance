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
  title: "NeoFinance",
  description: "NeoFinance - smart finance tracking and analysis.",
  icons: {
    icon: "/nf-icon.svg",
    shortcut: "/nf-icon.svg",
    apple: "/nf-icon.svg",
  },
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
