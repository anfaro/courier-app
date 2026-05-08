// app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import BottomNav from "@/components/BottomNav"; // <-- IMPORTED HERE

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Courier Super App", // Updated title!
  description: "Logistics and Delivery Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Wrap children with the Providers */}
        <Providers>
          {children}
          {/* THE NEW BOTTOM NAVIGATION */}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

