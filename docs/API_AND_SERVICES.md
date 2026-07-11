# API & Services

The Brookvalley HMS utilizes a service-oriented approach to bridge the gap between Next.js React Server/Client Components and the Supabase database.

---

## 🏗️ Service Architecture

Instead of writing Supabase queries directly inside React components, database operations are abstracted into specific service modules located within their respective features (e.g., `features/bookings/services/bookingsService.ts`).

### Benefits of the Service Layer:
1. **Decoupling:** UI components do not need to know *how* data is fetched or mutated.
2. **Reusability:** The same data fetching logic can be reused across multiple pages or API routes.
3. **Type Safety:** Service functions strictly return TypeScript models defined in `types/index.ts`.
4. **Mockability:** Services can easily be mocked in unit tests using Vitest.

---

## 📦 Core Services

### 1. `features/bookings/services/bookingsService.ts`
Handles all logic relating to guest reservations.
- `getBookings()`: Retrieves all bookings with related room and guest info.
- `createBooking(data)`: Validates availability, creates the booking, and updates the associated room's status to occupied if check-in is today.
- `updateBookingStatus(id, status)`: Modifies booking status and automatically triggers room status syncing (e.g., setting a room to 'cleaning' when a guest checks out).

### 2. `features/settings/services/settingsService.ts` (Formerly roomService)
Handles room definitions and hotel settings.
- `getRooms()`: Retrieves all rooms and their current operational status.
- `updateRoomStatus(id, status)`: Admin function to force a room status change (e.g., from 'cleaning' to 'available').
- `getRoomTypes()`: Retrieves available pricing and capacity tiers.

### 3. `features/employees/services/employeeService.ts`
Handles staff directory operations.
- `getEmployees()`: Retrieves staff list.
- `updateEmployeeRole(id, role)`: Mutates a user's role (restricted to admins via RLS).

---

## 🔗 Client vs Server Data Fetching

Because the application uses Supabase client-side authentication (`@supabase/supabase-js`), most data fetching happens in **Client Components** (`"use client"`).

- **Data Fetching:** Components utilize standard React `useEffect` or data fetching libraries (like SWR or React Query if integrated) to call the Service Layer.
- **Mutations:** Form submissions call the Service Layer, which throws standardized errors if validation or database constraints fail. The UI is responsible for catching and displaying these errors via toast notifications.

---

## 🔒 Context APIs

### `AuthProvider` (`contexts/AuthProvider.tsx`)
The central state manager for the user's session.
- Subscribes to Supabase `onAuthStateChange`.
- Exposes `user`, `role`, and `session` to all descendent components.
- Sets a secure cookie (`sb-access-token`) so the Edge Middleware can protect routes before rendering.
