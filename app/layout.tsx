import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INTIANA IBFT Control",
  description: "Operational visa-fee payment control for INTIANA Finance.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
