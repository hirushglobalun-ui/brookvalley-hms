# Employees Feature Module

This module organizes staff credentials, privilege roles, active status switches, and logs creation histories.

## Directory Components

- **`components/EmployeeCard.tsx`**: Displays individual employee avatar initials, contact channels, joined timelines, and created reservations counts.
- **`components/EmployeeFormModal.tsx`**: Standardized dialog for adding new credentials with passwords or updating profile configurations.
- **`components/EmployeeActivityModal.tsx`**: Displays audit trails containing reservations created by the selected employee.
- **`services/employeesService.ts`**: Coordinates auth credential setup in Supabase auth and profiles updates.
- **`repository/employeesRepository.ts`**: Handles DB queries to Supabase `employees` profiles table.
