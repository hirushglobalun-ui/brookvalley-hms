# Brookvalley Hotel Management System - Documentation

Welcome to the central documentation hub for the Brookvalley Hotel Management System (HMS). This directory contains all the architectural, technical, and operational documentation required to understand, run, and scale this enterprise Next.js application.

## 📚 Documentation Index

### 1. [Getting Started](GETTING_STARTED.md)
Instructions on how to set up the project locally, manage environment variables (`.env`), and start the Next.js development server.

### 2. [Project Architecture](ARCHITECTURE.md)
Detailed overview of the **Feature-Based Next.js Architecture**, Directory Structure, and the decoupling strategy used in the codebase.

### 3. [Database Schema & Security](DATABASE_SCHEMA.md)
Documentation of the Supabase PostgreSQL schema, tables, relationships, and Row Level Security (RLS) policies.

### 4. [API & Services](API_AND_SERVICES.md)
Guidelines on how domain services (`bookingsService.ts`, `employeeService.ts`), Context APIs, and server integrations are structured and consumed by the UI.

### 5. [Testing Strategy](TESTING.md)
A guide explaining the current testing stack (Vitest for Unit testing, Playwright for E2E) and instructions for writing and executing new tests.

### 6. [Supabase Migration Guide](SUPABASE_MIGRATION_GUIDE.md)
Historical context and technical steps regarding the migration from Firebase to Supabase.

---

*For feature-specific documentation, refer to the `README.md` files located inside the respective `features/` subdirectories (e.g., `features/bookings/README.md`).*
