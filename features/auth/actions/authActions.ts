"use server";

import { cookies, headers } from "next/headers";

const LIMIT = 999; // Effectively disabled — no app-level rate limit
const WINDOW_MS = 60 * 1000; // 1 minute (short reset window)

// In-memory rate limit records
const attemptsMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Checks if the client has exceeded the login rate limit.
 */
export async function checkLoginRateLimit(email: string): Promise<{ allowed: boolean; message?: string }> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
  const key = `${ip}:${email.toLowerCase().trim()}`;
  
  const now = Date.now();
  const record = attemptsMap.get(key);

  if (record) {
    if (now > record.resetAt) {
      // Window expired, reset count
      attemptsMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true };
    }

    if (record.count >= LIMIT) {
      const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
      return { 
        allowed: false, 
        message: `Too many login attempts. Please try again in ${minutesLeft} minutes.` 
      };
    }

    record.count += 1;
    attemptsMap.set(key, record);
  } else {
    attemptsMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }

  return { allowed: true };
}

/**
 * Resets the rate limit score for the user on successful login.
 */
export async function resetLoginRateLimit(email: string): Promise<void> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown-ip";
  const key = `${ip}:${email.toLowerCase().trim()}`;
  attemptsMap.delete(key);
}

/**
 * Sets an HttpOnly cookie on the server for secure session storage.
 * This mitigates XSS vulnerabilities compared to document.cookie.
 */
export async function setServerCookie(name: string, value: string, maxAge: number) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    path: "/",
    maxAge: maxAge,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

/**
 * Removes a server cookie securely.
 */
export async function removeServerCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
