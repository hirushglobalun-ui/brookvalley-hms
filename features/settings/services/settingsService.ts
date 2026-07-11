import { SettingsRepository } from "../repository/settingsRepository";
import { CreateRoomTypeDTO, UpdateRoomTypeDTO, CreateRoomDTO } from "../dto/settings.dto";
import { createRoomTypeSchema, updateRoomTypeSchema, roomSchema } from "../schemas/settings.schema";
import { Logger } from "../../../shared/logger/logger";
import { logActivity } from "../../../services/activityService";
import { ValidationError } from "../../../shared/errors";
import { RoomType } from "../../../types";

const repo = new SettingsRepository();

/**
 * Service orchestrating room and settings domain calculations.
 */
export class SettingsService {
  /**
   * Retrieves list of configured room types.
   */
  public async getRoomTypes(): Promise<RoomType[]> {
    const entities = await repo.getRoomTypes();
    return entities.map(e => ({
      id: e.id,
      name: e.name,
      price: e.price,
      capacity: e.capacity,
      description: e.description
    }));
  }

  /**
   * Validates and configures a new room type record.
   */
  public async addRoomType(dto: CreateRoomTypeDTO, adminUser: any): Promise<void> {
    const parse = createRoomTypeSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid Room Type specs", parse.error.flatten().fieldErrors as any);
    }
    
    Logger.info("Creating room type config", { id: dto.id, creator: adminUser?.email });
    await repo.addRoomType(dto);
    await logActivity("CREATE_ROOM_TYPE", `Created room type ${dto.name}`, adminUser);
  }

  /**
   * Validates and updates room type parameters.
   */
  public async updateRoomType(id: string, dto: UpdateRoomTypeDTO, adminUser: any): Promise<void> {
    const parse = updateRoomTypeSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid Room Type specs", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Updating room type config", { id, creator: adminUser?.email });
    await repo.updateRoomType(id, dto);
    await logActivity("UPDATE_ROOM_TYPE", `Updated room type ${dto.name}`, adminUser);
  }

  /**
   * Soft-deletes a room type layout.
   */
  public async deleteRoomType(id: string, name: string, adminUser: any, reason: string = "Retired"): Promise<void> {
    Logger.warn("Soft-deleting room type config", { id, creator: adminUser?.email });
    await repo.deleteRoomType(id, reason, adminUser);
    await logActivity("DELETE_ROOM_TYPE", `Soft-deleted room type ${name}. Reason: ${reason}`, adminUser);
  }

  /**
   * Retrieves soft-deleted room types (Admin Only).
   */
  public async getDeletedRoomTypes(adminUser: any): Promise<RoomType[]> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can query deleted records.");
    }
    const entities = await repo.getDeletedRoomTypes();
    return entities.map(e => ({
      id: e.id,
      name: e.name,
      price: e.price,
      capacity: e.capacity,
      description: e.description
    }));
  }

  /**
   * Restores a soft-deleted room type (Admin Only).
   */
  public async restoreRoomType(id: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can restore records.");
    }
    Logger.info("Restoring room type", { id, user: adminUser?.email });
    await repo.restoreRoomType(id);
    await logActivity("RESTORE_ROOM_TYPE", `Restored room type ${id}`, adminUser);
  }

  /**
   * Permanently purges a room type configuration (Admin Only).
   */
  public async purgeRoomType(id: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can purge records.");
    }
    Logger.error("Purging room type config permanently", undefined, { id, user: adminUser?.email });
    await repo.purgeRoomType(id);
    await logActivity("PURGE_ROOM_TYPE", `Permanently purged room type ${id}`, adminUser);
  }

  /**
   * Retrieves all room list models.
   */
  public async getRooms() {
    const entities = await repo.getRooms();
    return entities.map(e => ({
      id: e.roomNumber,
      roomNumber: e.roomNumber,
      roomType: e.roomType,
      status: e.status
    }));
  }

  /**
   * Creates a physical room number configuration.
   */
  public async addRoom(dto: CreateRoomDTO, adminUser: any): Promise<void> {
    const parse = roomSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid Room config values", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Adding physical room config", { roomNumber: dto.roomNumber, creator: adminUser?.email });
    await repo.addRoom(dto);
    await logActivity("CREATE_ROOM", `Added room ${dto.roomNumber} (${dto.roomType})`, adminUser);
  }

  /**
   * Triggers status modifications.
   */
  public async updateRoomStatus(roomNumber: string, status: "available" | "occupied" | "maintenance" | "reserved" | "dirty", adminUser: any): Promise<void> {
    Logger.info("Updating room status state", { roomNumber, status, user: adminUser?.email });
    await repo.updateRoomStatus(roomNumber, status);
    await logActivity("UPDATE_ROOM_STATUS", `Updated room ${roomNumber} to ${status}`, adminUser);
  }

  /**
   * Marks a dirty room as available after cleaning.
   */
  public async markRoomAsClean(roomNumber: string, adminUser: any): Promise<void> {
    Logger.info("Marking room as clean", { roomNumber, user: adminUser?.email });
    await repo.updateRoomStatus(roomNumber, "available");
    await logActivity("CLEAN_ROOM", `Cleaned room ${roomNumber} (status changed to available)`, adminUser);
  }

  /**
   * Soft-deletes a room config.
   */
  public async deleteRoom(roomNumber: string, adminUser: any, reason: string = "Retired"): Promise<void> {
    Logger.warn("Soft-deleting room number configuration", { roomNumber, user: adminUser?.email });
    await repo.deleteRoom(roomNumber, reason, adminUser);
    await logActivity("DELETE_ROOM", `Soft-deleted room ${roomNumber}. Reason: ${reason}`, adminUser);
  }

  /**
   * Retrieves soft-deleted rooms (Admin Only).
   */
  public async getDeletedRooms(adminUser: any): Promise<any[]> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can query deleted records.");
    }
    const entities = await repo.getDeletedRooms();
    return entities.map(e => ({
      id: e.roomNumber,
      roomNumber: e.roomNumber,
      roomType: e.roomType,
      status: e.status
    }));
  }

  /**
   * Restores a soft-deleted room (Admin Only).
   */
  public async restoreRoom(roomNumber: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can restore records.");
    }
    Logger.info("Restoring room configuration", { roomNumber, user: adminUser?.email });
    await repo.restoreRoom(roomNumber);
    await logActivity("RESTORE_ROOM", `Restored room ${roomNumber}`, adminUser);
  }

  /**
   * Permanently purges a room configuration (Admin Only).
   */
  public async purgeRoom(roomNumber: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can purge records.");
    }
    Logger.error("Purging room config permanently", undefined, { roomNumber, user: adminUser?.email });
    await repo.purgeRoom(roomNumber);
    await logActivity("PURGE_ROOM", `Permanently purged room ${roomNumber}`, adminUser);
  }

  /**
   * Updates room specification properties.
   */
  public async updateRoom(oldRoomNumber: string, dto: CreateRoomDTO, adminUser: any): Promise<void> {
    const parse = roomSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid Room specs", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Updating room specifications", { oldRoomNumber, roomNumber: dto.roomNumber, user: adminUser?.email });
    await repo.updateRoom(oldRoomNumber, dto);
    await logActivity("UPDATE_ROOM", `Updated room ${oldRoomNumber} to ${dto.roomNumber} (${dto.roomType})`, adminUser);
  }

  /**
   * Resets room configurations and clears mappings.
   */
  public async clearAllRoomTypes(adminUser: any): Promise<void> {
    Logger.error("Wiping all rooms configurations", undefined, { admin: adminUser?.email });
    await repo.clearAllRoomTypes();
    await logActivity("CLEAR_ALL_ROOM_TYPES", "Cleared all room types and rooms configurations", adminUser);
  }

  /**
   * Seeds standard room configurations on initial setup.
   */
  public async seedInitialData(force = false): Promise<boolean> {
    const existing = await repo.getRoomTypes();
    if (existing.length > 0 && !force) {
      return false;
    }

    if (force) {
      await repo.clearAllRoomTypes();
    }

    const roomTypesData = [
      { id: "hut-room", name: "Hut Room", price: 90, capacity: 2, description: "Rustic traditional mud hut offering basic nature stay amenities." },
      { id: "pool-view-deluxe", name: "Pool View Deluxe Room", price: 160, capacity: 2, description: "Deluxe room with balcony overlooking the primary swimming pool." },
      { id: "stream-view-deluxe", name: "Stream View Deluxe Room", price: 180, capacity: 2, description: "Premium room alongside the flowing mountain stream." },
      { id: "3bh-villa", name: "3bh Villa", price: 350, capacity: 6, description: "Spacious three bedroom family villa with kitchen." },
      { id: "3bh-premium-villa", name: "3bh Premium Villa", price: 480, capacity: 8, description: "Luxury three bedroom villa with private plunge pool and garden." }
    ];

    const roomsData = [
      { room_number: "101", room_type_id: "hut-room", status: "available" },
      { room_number: "102", room_type_id: "hut-room", status: "available" },
      { room_number: "103", room_type_id: "hut-room", status: "available" },
      { room_number: "201", room_type_id: "pool-view-deluxe", status: "available" },
      { room_number: "202", room_type_id: "pool-view-deluxe", status: "available" },
      { room_number: "203", room_type_id: "pool-view-deluxe", status: "available" },
      { room_number: "301", room_type_id: "stream-view-deluxe", status: "available" },
      { room_number: "302", room_type_id: "stream-view-deluxe", status: "available" },
      { room_number: "401", room_type_id: "3bh-villa", status: "available" },
      { room_number: "501", room_type_id: "3bh-premium-villa", status: "available" }
    ];

    Logger.info("Executing room seeding sequence", { force });
    await repo.seedInitialData(roomTypesData, roomsData);
    return true;
  }
}
