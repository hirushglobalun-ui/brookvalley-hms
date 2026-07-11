if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom");
}
import { vi } from "vitest";

import fs from "fs";
import path from "path";

// Try to load real Supabase keys from .env
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^["']|["']$/g, "").replace(/\r/g, "");
        if (key === "VITE_SUPABASE_URL") {
          process.env.NEXT_PUBLIC_SUPABASE_URL = value;
        } else if (key === "VITE_SUPABASE_ANON_KEY") {
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = value;
        }
      }
    });
  }
} catch (err) {
  console.warn("Failed to load .env in vitest.setup.ts:", err);
}

// Fallback mocks
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
}

// Global mocks
vi.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    };
  },
  useSearchParams() {
    return {
      get: vi.fn()
    };
  },
  usePathname() {
    return "";
  }
}));
