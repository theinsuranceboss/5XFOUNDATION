import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import A11yAnnouncer from "@/components/A11yAnnouncer";
import GlobalStyles from "@/components/GlobalStyles";
import { CartSidebar } from "@/components/cart-sidebar";
import { ProductDetail } from "@/components/product-detail";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Five Time Foundation™ | Empowering Cancer Warriors",
  description: "Five Time Foundation™ empowers cancer warriors to reclaim mobility, confidence, and connection after limb loss. Founded by 6-time survivor Rich Canci.",
  openGraph: {
    title: "Five Time Foundation™ | Empowering Cancer Warriors",
    description: "Five Time Foundation™ empowers cancer warriors to reclaim mobility, confidence, and connection after limb loss. Founded by 6-time survivor Rich Canci.",
    images: [
      {
        url: "https://lh3.googleusercontent.com/d/1GloYcyjba51jJK933pSBzQJcfrc_H43Y",
        width: 1200,
        height: 630,
        alt: "Five Time Foundation™ Logo",
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Five Time Foundation™ | Empowering Cancer Warriors",
    description: "Five Time Foundation™ empowers cancer warriors to reclaim mobility, confidence, and connection after limb loss. Founded by 6-time survivor Rich Canci.",
    images: ["https://lh3.googleusercontent.com/d/1GloYcyjba51jJK933pSBzQJcfrc_H43Y"],
  }
};

import MainLayoutWrapper from "@/components/MainLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-neon-green/30 selection:text-black">
        <CartProvider>
          <GlobalStyles />
          <A11yAnnouncer />
          <Navigation />

          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
          <ProductDetail />
          <CartSidebar />
          <Toaster position="bottom-right" />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}


