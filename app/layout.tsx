import React from "react";
import { AuthProvider } from "../contexts/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Brookvalley Hotel HMS",
  description: "Guest Reservation & Staff Portal",
  icons: {
    icon: "/image-Photoroom (27).png",
    shortcut: "/image-Photoroom (27).png",
    apple: "/image-Photoroom (27).png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
