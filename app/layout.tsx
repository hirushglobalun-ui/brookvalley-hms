import React from "react";
import { AuthProvider } from "../contexts/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Brookvalley Hotel HMS",
  description: "Guest Reservation & Staff Portal",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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
