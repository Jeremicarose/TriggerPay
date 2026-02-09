import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TriggerPay - Flight Insurance on NEAR",
  description: "Decentralized flight delay insurance with cross-chain payouts powered by NEAR Chain Signatures",
  keywords: ["NEAR", "flight insurance", "blockchain", "chain signatures", "DeFi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
