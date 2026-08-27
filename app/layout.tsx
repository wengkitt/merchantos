import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MerchantOS — Agent-ready merchant operations",
  description:
    "A WebMCP-enabled operations workspace for the fictional Pinang Batchworks cookie studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
