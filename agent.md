# AGENTS.md

# Brook Valley Hotel Management System (HMS)
## AI Development & Migration Guide

Version: 1.0
Project Type: Enterprise Hotel Management System
Framework Migration:
React + Vite + Supabase
➡
Next.js 16 + React 19 + TypeScript + App Router + Supabase

---

# PRIMARY OBJECTIVE

The objective of this project is NOT to redesign, rewrite, or improve the application.

The objective is to perform a COMPLETE FRAMEWORK MIGRATION from:

• React 19
• Vite 8
• React Router 7

to

• Next.js 16
• React 19
• App Router
• TypeScript Strict Mode

while preserving **100% feature parity**.

Everything must behave exactly as it does today.

The final application should be visually identical and functionally identical.

---

# GOLDEN RULE

Never change any business logic.

Never redesign any UI.

Never modify workflows.

Never rename database tables.

Never rename columns.

Never remove features.

Never simplify code.

Never replace logic unless absolutely required by Next.js.

---

# MIGRATION GOALS

The migration must preserve:

✓ UI
✓ UX
✓ Styling
✓ CSS
✓ Components
✓ Animations
✓ Icons
✓ Layout
✓ Navigation
✓ Authentication
✓ Authorization
✓ Database
✓ Storage
✓ Reports
✓ Calendar
✓ Employees
✓ Dashboard
✓ Bookings
✓ Settings
✓ Activity Logs
✓ RLS
✓ RPC Functions
✓ SQL Schema

Everything should work exactly like the existing application.

---

# DO NOT CHANGE

Never change:

Design

Spacing

Colors

Fonts

CSS classes

CSS variables

Responsive behavior

Icons

Animations

Loading behavior

Toast behavior

Modal behavior

Tables

Cards

Forms

Validation messages

Button placement

Sidebar

Header

Dashboard layout

Calendar layout

Employee management UI

Booking UI

Reports UI

Settings UI

---

# DO NOT CHANGE DATABASE

The database is already complete.

Do NOT modify:

Supabase Tables

Supabase Schema

RLS Policies

RPC Functions

Storage Buckets

Triggers

Indexes

Views

Constraints

Relationships

Primary Keys

Foreign Keys

Enum values

---

# CURRENT DATABASE

Profiles

Employees

Room Types

Rooms

Bookings

Activity Logs

Storage:
payment-proofs

These must remain unchanged.

---

# AUTHENTICATION

Keep existing authentication logic.

Must preserve:

Login

Logout

Session persistence

Auto login

Role checking

Admin access

Employee access

Inactive account blocking

Profile loading

Permission checking

Protected routes

---

# STORAGE

Continue using Supabase Storage.

Bucket:

payment-proofs

Keep upload logic identical.

Keep delete logic identical.

Keep public URL generation identical.

---

# FRAMEWORK MIGRATION

Current

React
Vite
React Router

↓

Target

Next.js 16
React 19
App Router
TypeScript Strict

---

# ROUTE MAPPING

/login

↓

app/login/page.tsx

/dashboard

↓

app/dashboard/page.tsx

/bookings

↓

app/bookings/page.tsx

/calendar

↓

app/calendar/page.tsx

/reports

↓

app/reports/page.tsx

/employees

↓

app/employees/page.tsx

/settings

↓

app/settings/page.tsx

---

# PROJECT STRUCTURE

app/

layout.tsx

page.tsx

loading.tsx

error.tsx

globals.css

login/

dashboard/

bookings/

calendar/

reports/

employees/

settings/

components/

contexts/

hooks/

lib/

supabase.ts

db.ts

storage.ts

auth.ts

types/

utils/

constants/

middleware.ts

public/

---

# COMPONENT RULES

Move every component.

Never redesign.

Never rewrite JSX unless required.

Never remove props.

Never rename props.

Never change state logic.

Never change event handling.

Never change UI structure.

---

# CSS RULES

Move existing CSS.

Rename

index.css

↓

globals.css

Do NOT convert to Tailwind.

Do NOT change selectors.

Do NOT optimize CSS.

Do NOT merge CSS.

Keep identical.

---

# TYPESCRIPT RULES

Convert all JS to TS.

Use:

strict: true

Never use:

any

Use proper interfaces.

Create reusable types.

Use enums where appropriate.

No TypeScript errors.

No ESLint errors.

No Oxlint errors.

---

# DATABASE LAYER

Keep identical API.

lib/db.ts

Must expose the same functions.

Example:

getBookings()

createBooking()

updateBooking()

deleteBooking()

getRooms()

getEmployees()

createEmployee()

deleteEmployee()

getReports()

logActivity()

No logic changes.

---

# SUPABASE CLIENT

Create

lib/supabase.ts

Only change environment variable names.

Old

VITE_SUPABASE_URL

↓

NEXT_PUBLIC_SUPABASE_URL

Old

VITE_SUPABASE_ANON_KEY

↓

NEXT_PUBLIC_SUPABASE_ANON_KEY

Nothing else changes.

---

# AUTH PROVIDER

Move AuthContext

↓

contexts/AuthProvider.tsx

Do not change logic.

---

# NAVIGATION

Replace

React Router

with

Next Link

Next Router

App Router

Only routing API changes.

No UI changes.

---

# MIDDLEWARE

Protect

/dashboard

/bookings

/calendar

/reports

/employees

/settings

Redirect unauthenticated users to

/login

---

# PERFORMANCE

Allowed improvements:

Server Components

Streaming

Suspense

Caching

Code Splitting

Image Optimization

Metadata API

Nothing should affect UI.

---

# CODE QUALITY

Must follow:

SOLID

DRY

KISS

Clean Architecture

Reusable Components

Strict TypeScript

Feature-first organization

No duplicated logic

Small reusable functions

Readable naming

Consistent formatting

---

# ACCESSIBILITY

Maintain or improve:

ARIA

Keyboard Navigation

Focus Management

Screen Reader Support

Labels

Semantic HTML

Never reduce accessibility.

---

# TESTING CHECKLIST

Before finishing any task verify:

Login works

Logout works

Dashboard works

Bookings CRUD works

Calendar works

Reports work

Employees CRUD works

Settings work

Activity Logs work

Room Types work

Rooms work

Payment Upload works

Storage works

Authentication works

Authorization works

No Console Errors

No Build Errors

No Type Errors

No ESLint Errors

No Oxlint Errors

Responsive Layout works

---

# WHAT IS ALLOWED

Convert JS → TS

React Router → App Router

Vite → Next

Improve folder structure

Improve type safety

Improve imports

Improve performance

Improve code organization

Nothing else.

---

# WHAT IS NOT ALLOWED

Changing UI

Changing UX

Changing Database

Changing SQL

Changing Colors

Changing Fonts

Changing Layout

Changing Features

Changing Business Logic

Changing Validation

Changing API behavior

Changing User Flow

Changing Forms

Changing Dashboard

Changing Calendar

Changing Employee System

Changing Booking System

Changing Reports

Changing Settings

Changing Authentication

Changing Storage

---

# DEVELOPMENT PROCESS

For every task follow this order:

1. Analyze existing implementation

2. Understand current behavior

3. Preserve behavior

4. Convert to TypeScript

5. Convert routing

6. Verify functionality

7. Compare with original

8. Ensure identical UI

9. Ensure identical UX

10. Commit only when feature parity is achieved

Never skip steps.

---

# DEFINITION OF DONE

A task is complete ONLY IF:

✅ UI is identical

✅ UX is identical

✅ Features are identical

✅ Database unchanged

✅ Authentication unchanged

✅ Storage unchanged

✅ Responsive behavior unchanged

✅ No console errors

✅ No build errors

✅ No TypeScript errors

✅ No lint errors

✅ Feature parity achieved

Anything less is considered incomplete.

---

END OF AGENTS.md