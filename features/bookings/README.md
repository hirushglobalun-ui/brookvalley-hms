# Bookings Feature Module

The Bookings feature manages customer stay reservations, check-in/check-out states, payment details, and reactive room assignments.

## Directory Components

- **`components/BookingTable.tsx`**: Renders list view table for desktop viewports and custom responsive cards for mobile viewports.
- **`components/BookingDetailModal.tsx`**: Presentational detail card modal overlay with built-in role-based data masking.
- **`components/BookingFormModal.tsx`**: Modal encapsulating stateful fields, check-in validations, price calculations, and file loading base64 converters for attachments.
- **`services/bookingsService.ts`**: Interacts with database layer to record bookings, updates occupancy status of designated rooms, and writes audit actions into `activityLog`.
- **`repository/bookingsRepository.ts`**: Handles low-level database operations against Supabase `bookings` table.
- **`schemas/bookings.schema.ts`**: Defines Zod validations for registering and editing customer bookings.
