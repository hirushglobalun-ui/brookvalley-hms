import React from "react";
import { AuthProvider } from "../contexts/AuthProvider";
import "./globals.css";

export const metadata = {
  title: "Brookvalley Hotel HMS",
  description: "Guest Reservation & Staff Portal",
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
