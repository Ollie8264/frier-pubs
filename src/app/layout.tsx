import type { Metadata, Viewport } from "next";
import { Inter, Crimson_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const title = "Frier's Useful Pub Map";
const description =
  "2,470 of London's pubs and bars, filterable by what you actually care about: food, live sport, beer gardens, real ale, pool tables, quiz nights, dog-friendly, and more.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  applicationName: title,
  authors: [{ name: "Ollie Frier" }],
  keywords: [
    "London pubs", "pub finder", "London bars", "best London pubs",
    "live sport pubs", "beer gardens", "real ale", "dog friendly pubs",
    "pub quiz", "London", "drink",
  ],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    title,
    description,
    siteName: title,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${crimson.variable} h-full`}>
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
