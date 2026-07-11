# Database Schema & Security

The Brookvalley HMS uses **Supabase (PostgreSQL)** as its primary database. This document outlines the core tables, their purposes, and the Row Level Security (RLS) strategies employed.

---

## 🗄️ Core Tables

### `bookings`
Stores all guest reservations and their current statuses.
- **id** (UUID, Primary Key)
- **guest_name** (Text)
- **room_id** (UUID, Foreign Key to `rooms.id`)
- **check_in** (Date)
- **check_out** (Date)
- **status** (Enum: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`)
- **payment_status** (Enum: `pending`, `paid`, `refunded`)
- **total_amount** (Numeric)
- **created_at** (Timestamp)

### `rooms`
Stores individual physical rooms in the hotel.
- **id** (UUID, Primary Key)
- **room_number** (Text, Unique)
- **room_type_id** (UUID, Foreign Key to `room_types.id`)
- **status** (Enum: `available`, `occupied`, `maintenance`, `cleaning`)
- **created_at** (Timestamp)

### `room_types`
Defines the categories of rooms and their base configurations.
- **id** (UUID, Primary Key)
- **name** (Text) (e.g., "Deluxe Suite", "Standard Double")
- **description** (Text)
- **base_price** (Numeric)
- **capacity** (Integer)
- **created_at** (Timestamp)

### `employees`
Stores hotel staff information and role assignments.
- **id** (UUID, Primary Key)
- **auth_id** (UUID, Foreign Key to Supabase Auth `auth.users.id`, nullable)
- **first_name** (Text)
- **last_name** (Text)
- **email** (Text, Unique)
- **role** (Enum: `admin`, `manager`, `receptionist`, `housekeeping`)
- **department** (Text)
- **status** (Enum: `active`, `inactive`, `on_leave`)
- **created_at** (Timestamp)

### `activity_logs`
An append-only audit trail for tracking system changes.
- **id** (UUID, Primary Key)
- **user_id** (UUID, Foreign Key to `employees.id`)
- **action** (Text) (e.g., "BOOKING_CREATED", "ROOM_STATUS_UPDATED")
- **entity_type** (Text)
- **entity_id** (UUID)
- **metadata** (JSONB)
- **created_at** (Timestamp)

---

## 🛡️ Row Level Security (RLS)

Supabase RLS is heavily utilized to ensure that only authenticated and authorized users can access or mutate data.

### General Policies
1. **Unauthenticated Access:** Denied by default across all tables.
2. **Authenticated Read Access:** Most core operational tables (`rooms`, `room_types`) are readable by any authenticated staff member (user with a valid JWT).

### Role-Based Policies
For sensitive operations (e.g., managing employees, refunding payments, viewing audit logs), RLS policies inspect the user's role:
- **Employees Table:** Only users with an `admin` or `manager` role can Insert/Update/Delete employee records.
- **Activity Logs:** Insertions are allowed by all authenticated users (to log their own actions), but Select (viewing) is restricted to `admin` and `manager` roles.

### Storage Security
- **Employee Documents / Proofs:** Files uploaded to Supabase Storage buckets (e.g., ID proofs) are restricted via Storage RLS so they can only be viewed by `admin` users or the employee who uploaded them.
