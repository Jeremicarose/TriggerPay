import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TriggerPay - Conditional Payments on NEAR",
  description: "Set real-world conditions, get automatic cross-chain payouts. Verified by TEE, signed via NEAR Chain Signatures.",
  keywords: ["NEAR", "conditional payments", "blockchain", "chain signatures", "shade agents", "TEE"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <Providers>
          {/* Subtle radar grid background */}
          <div className="fixed inset-0 radar-grid opacity-30 pointer-events-none" />

          {/* Main content */}
          <div className="relative z-10">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
