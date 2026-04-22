import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic SEO & AEO Swarm | Arc L1 × Circle Nanopayments",
  description:
    "8-agent AI swarm for automated SEO & AEO optimization with micro-payments settled on Arc Layer-1 blockchain via Circle SDK.",
  keywords: [
    "SEO optimization",
    "AEO optimization",
    "AI agents",
    "Arc blockchain",
    "Circle nanopayments",
    "USDC",
    "x402 protocol",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
