import { z } from "zod";

/**
 * Zod validation schema for creating a new employee.
 */
export const createEmployeeSchema = z.object({
  fullName: z.string().min(1, "Full Name is required").max(100),
  email: z.string().email("A valid email address is required"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  role: z.enum(["admin", "employee", "manager"]),
  status: z.enum(["active", "inactive"]).default("active"),
  joinedDate: z.string().min(1, "Joined date is required"),
  notes: z.string().optional()
});

/**
 * Zod validation schema for updating an existing employee's details.
 */
export const updateEmployeeSchema = z.object({
  fullName: z.string().min(1, "Full Name is required").max(100),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  role: z.enum(["admin", "employee", "manager"]),
  notes: z.string().optional()
});
