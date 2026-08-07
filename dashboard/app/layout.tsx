import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guest Guide — Owner Dashboard",
  description: "Edit your property. Publish to the tablet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
