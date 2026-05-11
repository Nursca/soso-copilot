import type { Metadata } from "next";
import { headers } from "next/headers";
import AppKitProvider from "@/context/AppKitProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoSo Copilot — AI Finance Intelligence",
  description: "AI-powered personal finance copilot",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieHeader = (await headers()).get("cookie");

  return (
    <html lang="en">
      <body>
        <AppKitProvider cookies={cookieHeader}>
          {children}
        </AppKitProvider>
      </body>
    </html>
  );
}
