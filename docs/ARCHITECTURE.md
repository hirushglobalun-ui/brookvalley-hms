# Project Architecture & Directory Structure

This document outlines the codebase structure and structural patterns used in the **Brookvalley Hotel Management System (HMS)**. The project strictly adheres to a **Feature-Based Architecture** using Next.js 16 (App Router), React 19, and TypeScript.

---

## 📁 Directory Tree

```text
brookvalley-hms/
├── app/                              # Next.js App Router root
│   ├── (dashboard)/                  # Protected dashboard route group
│   │   ├── bookings/
│   │   │   └── page.tsx              # Booking feature entry point
│   │   ├── calendar/
│   │   │   └── page.tsx              # Timeline calendar feature entry point
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard metrics entry point
│   │   ├── employees/
│   │   │   └── page.tsx              # Employee directory entry point
│   │   ├── reports/
│   │   │   └── page.tsx              # Reports & Analytics entry point
│   │   ├── settings/
│   │   │   └── page.tsx              # System config tab container
│   │   └── layout.tsx                # Shared header, sidebar & auth shell
│   ├── login/
│   │   └── page.tsx                  # Login form view
│   ├── globals.css                   # Refactored system-wide CSS stylesheet
│   ├── layout.tsx                    # HTML structure, viewport, metadata
│   └── page.tsx                      # Root landing page (redirects to /dashboard)
├── docs/                             # Comprehensive project documentation
├── features/                         # 🌟 Feature-Based Modules (Core Logic)
│   ├── bookings/                     # Bookings feature domain
│   │   ├── components/               # Booking Modals, Tables, Forms
│   │   ├── services/                 # `bookingsService.ts`
│   │   ├── types/                    # Bookings-specific types
│   │   └── index.ts                  # Barrel export for bookings feature
│   ├── calendar/                     # Visual Timeline calendar feature
│   ├── dashboard/                    # Dashboard stats and charts
│   ├── employees/                    # Employee feature domain
│   ├── reports/                      # Analytics and reports feature
│   └── settings/                     # Settings and Room Configuration feature
├── constants/                        # Global Shared Constants
│   └── index.ts                      # Enums, statuses, and standard models
├── contexts/                         # React context providers
│   └── AuthProvider.tsx              # Handles session tracking & auth cookies
├── lib/                              # Supabase integrations & utility layers
│   ├── auth.ts                       # Custom auth hooks definitions
│   ├── dateUtils.ts                  # Shared date formatting helpers
│   ├── storage.ts                    # Supabase storage proof upload handlers
│   └── supabase.ts                   # Supabase client instantiation
├── types/                            # Global database model definitions
│   └── index.ts                      # Strict TypeScript interfaces
├── middleware.ts                     # Edge-level middleware route guard
└── tsconfig.json                     # Strict TypeScript compiler options
```

---

## 🛠️ System Architecture & Subsystems

### 1. Feature-Based Modularity (`features/`)
To achieve enterprise-grade maintainability, all domain logic is isolated into specific `features/` folders.
- **Encapsulation:** A feature module contains its own `components`, `services`, `types`, and `utils`.
- **Strict Boundaries:** Features expose their public API via a root `index.ts` (Barrel pattern). Features do not import deep internal files from other features; they only import from the `index.ts` file of another feature.

For example, `features/bookings` manages everything related to bookings. If the `calendar` feature needs booking data, it calls `import { bookingsService } from '@/features/bookings'`.

### 2. Authentication Flow & Middleware Guarding
Since Supabase runs client-side authentication storing tokens in LocalStorage, a synchronization bridge is used to support server-side rendering (SSR) routing checks:
- **`contexts/AuthProvider.tsx`**: Sets a cookie named `sb-access-token` containing the Supabase JWT access token on successful authentication. Deletes the cookie on sign-out.
- **`middleware.ts`**: Runs at the Edge. It checks for the presence of the `sb-access-token` cookie. If missing and the path falls under protected paths, it redirects the user to `/login`.

### 3. Data Integrity & Mappings (`types/index.ts` & `constants/index.ts`)
- **`types/index.ts`**: Defines strict schema interfaces for core domain models like `Booking`, `Room`, `RoomType`, `Employee`, and `ActivityLog`.
- **`constants/index.ts`**: Defines immutable object values and enums (`BOOKING_STATUS`, `PAYMENT_STATUS`, `ROOM_STATUS`, `USER_ROLE`) preventing hardcoded string drift.
