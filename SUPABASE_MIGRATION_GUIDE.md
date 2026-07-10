# Brook Valley Bookings - Supabase Migration Guide

This document explains the steps to configure and run the property management system with Supabase.

---

## 1. Setup Supabase Project

1. Sign up or log into [Supabase](https://supabase.com/).
2. Create a new project called **Brook Valley Bookings**.
3. Retrieve your project configuration credentials:
   - Go to **Project Settings > API**.
   - Copy the **Project API URL** and the **anon (public)** key.

---

## 2. Apply Database Schema & Seed Data

1. In the Supabase Studio sidebar, open the **SQL Editor**.
2. Create a **New Query**.
3. Copy the contents of [supabase/schema.sql](file:///c:/Users/HP/Desktop/brookvalley-hms/supabase/schema.sql) and paste them into the editor. Click **Run**.
4. Create another query, copy the contents of [supabase/seed.sql](file:///c:/Users/HP/Desktop/brookvalley-hms/supabase/seed.sql), paste them, and click **Run**.

---

## 3. Storage Setup (Payment Proofs)

1. Go to **Storage** in the Supabase Studio dashboard.
2. Click **New Bucket**.
3. Name the bucket `payment-proofs`.
4. Ensure the bucket is set to **Public** so that payment proofs can be retrieved easily by the app.
5. In order for users to upload/download files, create the following policies on the `payment-proofs` bucket (through **Storage > Policies**):
   - **Policy 1 (Select)**: Allow authenticated users read access.
   - **Policy 2 (Insert/Upload)**: Allow authenticated users upload access.
   - **Policy 3 (Update/Delete)**: Allow authenticated users modification access.

---

## 4. Auth Configuration Notes

To allow admins and employees to sign up/in:
- Email/Password auth is enabled by default in Supabase.
- Turn off **Confirm Email** under **Authentication > Providers > Email** in settings, if you wish to allow instant login upon account creation without requiring verification links.

---

## 5. Environment Variables Setup

Create a `.env` file in the root of the project with the following variables:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Do not commit this file to version control.

---

## 6. How Administrative Employee Creation Works

In Firebase, employee account creation required initializing a secondary app instance in the browser. In Supabase, this is replaced by a secure PostgreSQL RPC function `create_employee_user` defined with `SECURITY DEFINER` (executing as database admin).

- The client invokes `supabase.rpc('create_employee_user', { ... })`.
- The database checks that the active session matches a profile with an `admin` role.
- If verified, the database directly creates the authentication user in `auth.users`, handles password encryption using `pgcrypto`, and populates the matching profiles/employees tables.
- This secures employee creation without exposing the Supabase service role key to standard client interfaces, while keeping the logged-in admin user's session intact.

---

## 7. How to run the app after migration

1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch development server:
   ```bash
   npm run dev
   ```
