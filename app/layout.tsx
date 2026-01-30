import type { Metadata } from "next";
import "./globals.css";
import "../styles/diagram.css";

export const metadata: Metadata = {
  title: "Babel - XML Diagram Editor",
  description: "Multi-user XML diagram editor with version control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
