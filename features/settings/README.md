# Settings Feature Module

Coordinates pricing schemes, active room listings, security profiles (password changes), and administrator factory resets.

## Directory Components

- **`components/RoomTypesTab.tsx`**: Add, edit, or delete room types containing pricing levels, descriptions, and capacity limits.
- **`components/RoomsTab.tsx`**: Add, edit, or delete physical room numbers associated with configured types.
- **`components/SecurityTab.tsx`**: Encapsulates login email and password updates.
- **`components/ResetTab.tsx`**: Renders danger zones for wiping reservations, rooms, or resetting default records.
- **`services/settingsService.ts`**: Coordinates room configuration parameters, seed configurations, and DB sync.
