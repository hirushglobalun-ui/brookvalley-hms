"use server";

import { SettingsService } from "../services/settingsService";
import { CreateRoomTypeDTO, UpdateRoomTypeDTO, CreateRoomDTO } from "../dto/settings.dto";
import { revalidatePath } from "next/cache";

const service = new SettingsService();

/**
 * Server Action: Creates a new Room Type configuration.
 */
export async function addRoomTypeAction(dto: CreateRoomTypeDTO, adminUser: any) {
  await service.addRoomType(dto, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Updates an existing Room Type configuration.
 */
export async function updateRoomTypeAction(id: string, dto: UpdateRoomTypeDTO, adminUser: any) {
  await service.updateRoomType(id, dto, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Soft-deletes a Room Type configuration.
 */
export async function deleteRoomTypeAction(id: string, name: string, adminUser: any, reason: string = "Retired") {
  await service.deleteRoomType(id, name, adminUser, reason);
  revalidatePath("/settings");
}

/**
 * Server Action: Fetches all soft-deleted room types.
 */
export async function getDeletedRoomTypesAction(adminUser: any) {
  return await service.getDeletedRoomTypes(adminUser);
}

/**
 * Server Action: Restores a soft-deleted room type.
 */
export async function restoreRoomTypeAction(id: string, adminUser: any) {
  await service.restoreRoomType(id, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Permanently purges a room type.
 */
export async function purgeRoomTypeAction(id: string, adminUser: any) {
  await service.purgeRoomType(id, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Configures a new Room Number mapping.
 */
export async function addRoomAction(dto: CreateRoomDTO, adminUser: any) {
  await service.addRoom(dto, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Updates an existing Room Number mapping.
 */
export async function updateRoomAction(oldRoomNumber: string, dto: CreateRoomDTO, adminUser: any) {
  await service.updateRoom(oldRoomNumber, dto, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Soft-deletes a Room configuration.
 */
export async function deleteRoomAction(roomNumber: string, adminUser: any, reason: string = "Retired") {
  await service.deleteRoom(roomNumber, adminUser, reason);
  revalidatePath("/settings");
}

/**
 * Server Action: Fetches all soft-deleted rooms.
 */
export async function getDeletedRoomsAction(adminUser: any) {
  return await service.getDeletedRooms(adminUser);
}

/**
 * Server Action: Restores a soft-deleted room.
 */
export async function restoreRoomAction(roomNumber: string, adminUser: any) {
  await service.restoreRoom(roomNumber, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Permanently purges a room config.
 */
export async function purgeRoomAction(roomNumber: string, adminUser: any) {
  await service.purgeRoom(roomNumber, adminUser);
  revalidatePath("/settings");
}

/**
 * Server Action: Wipes all configured room types and rooms.
 */
export async function clearAllRoomTypesAction(adminUser: any) {
  await service.clearAllRoomTypes(adminUser);
  revalidatePath("/settings");
}
