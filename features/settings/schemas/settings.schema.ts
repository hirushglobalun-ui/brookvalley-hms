import { z } from "zod";

/**
 * Zod schema validation for creating a Room Type.
 */
export const createRoomTypeSchema = z.object({
  id: z.string().min(1, "Room Type ID is required").max(50),
  name: z.string().min(1, "Display Name is required").max(100),
  price: z.number().nonnegative("Price per night cannot be negative"),
  capacity: z.number().int().min(1, "Standard capacity must be at least 1 guest"),
  description: z.string().optional()
});

/**
 * Zod schema validation for updating a Room Type.
 */
export const updateRoomTypeSchema = z.object({
  name: z.string().min(1, "Display Name is required").max(100),
  price: z.number().nonnegative("Price per night cannot be negative"),
  capacity: z.number().int().min(1, "Standard capacity must be at least 1 guest"),
  description: z.string().optional()
});

/**
 * Zod schema validation for room configuration inputs.
 */
export const roomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").max(10),
  roomType: z.string().min(1, "Room Type assignment is required"),
  status: z.enum(["available", "occupied", "maintenance"])
});
