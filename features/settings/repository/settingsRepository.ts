import { supabase } from "../../../lib/supabase";
import { DatabaseError } from "../../../shared/errors";
import { RoomTypeEntity, RoomEntity } from "../domain/settings.domain";
import { CreateRoomTypeDTO, UpdateRoomTypeDTO, CreateRoomDTO, SettingsMapper } from "../dto/settings.dto";

/**
 * Repository class encapsulating all settings-related database operations.
 */
export class SettingsRepository {
  /**
   * Retrieves all room types from database.
   */
  public async getRoomTypes(): Promise<RoomTypeEntity[]> {
    const { data, error } = await supabase
      .from("room_types")
      .select("*")
      .is("deleted_at", null)
      .order("id");

    if (error) {
      throw new DatabaseError("Failed to fetch room types", error.code);
    }
    return (data || []).map(SettingsMapper.toRoomTypeEntity);
  }

  /**
   * Adds a new room type record.
   */
  public async addRoomType(dto: CreateRoomTypeDTO): Promise<void> {
    const { error } = await supabase.from("room_types").insert({
      id: dto.id,
      name: dto.name,
      price: dto.price,
      capacity: dto.capacity,
      description: dto.description || ""
    });

    if (error) {
      throw new DatabaseError("Failed to add room type to database", error.code);
    }
  }

  /**
   * Updates an existing room type configuration.
   */
  public async updateRoomType(id: string, dto: UpdateRoomTypeDTO): Promise<void> {
    const { error } = await supabase
      .from("room_types")
      .update({
        name: dto.name,
        price: dto.price,
        capacity: dto.capacity,
        description: dto.description || "",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to update room type: ${id}`, error.code);
    }
  }

  /**
   * Soft-deletes a room type record.
   */
  public async deleteRoomType(id: string, reason: string = "Retired", user: any = { uid: null }): Promise<void> {
    const { error } = await supabase
      .from("room_types")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.uid || null,
        delete_reason: reason
      })
      .eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to soft-delete room type: ${id}`, error.code);
    }
  }

  /**
   * Retrieves deleted room types (Admin Only).
   */
  public async getDeletedRoomTypes(): Promise<RoomTypeEntity[]> {
    const { data, error } = await supabase
      .from("room_types")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      throw new DatabaseError("Failed to fetch deleted room types", error.code);
    }
    return (data || []).map(SettingsMapper.toRoomTypeEntity);
  }

  /**
   * Restores a deleted room type.
   */
  public async restoreRoomType(id: string): Promise<void> {
    const { error } = await supabase
      .from("room_types")
      .update({
        deleted_at: null,
        deleted_by: null,
        delete_reason: null
      })
      .eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to restore room type: ${id}`, error.code);
    }
  }

  /**
   * Permanently purges a room type.
   */
  public async purgeRoomType(id: string): Promise<void> {
    const { error } = await supabase.from("room_types").delete().eq("id", id);
    if (error) {
      throw new DatabaseError(`Failed to permanently purge room type: ${id}`, error.code);
    }
  }

  /**
   * Retrieves all configured rooms.
   */
  public async getRooms(): Promise<RoomEntity[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .is("deleted_at", null)
      .order("room_number");

    if (error) {
      throw new DatabaseError("Failed to fetch rooms from database", error.code);
    }
    return (data || []).map(SettingsMapper.toRoomEntity);
  }

  /**
   * Configures a new room number record.
   */
  public async addRoom(dto: CreateRoomDTO): Promise<void> {
    const { error } = await supabase.from("rooms").insert({
      room_number: dto.roomNumber,
      room_type_id: dto.roomType,
      status: dto.status
    });

    if (error) {
      throw new DatabaseError("Failed to insert room record", error.code);
    }
  }

  /**
   * Updates room status.
   */
  public async updateRoomStatus(roomNumber: string, status: "available" | "occupied" | "maintenance" | "reserved" | "dirty"): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("room_number", roomNumber);

    if (error) {
      throw new DatabaseError(`Failed to update status for room ${roomNumber}`, error.code);
    }
  }

  /**
   * Soft-deletes a room config.
   */
  public async deleteRoom(roomNumber: string, reason: string = "Retired", user: any = { uid: null }): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.uid || null,
        delete_reason: reason
      })
      .eq("room_number", roomNumber);

    if (error) {
      throw new DatabaseError(`Failed to soft-delete room number ${roomNumber}`, error.code);
    }
  }

  /**
   * Retrieves deleted rooms (Admin Only).
   */
  public async getDeletedRooms(): Promise<RoomEntity[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      throw new DatabaseError("Failed to fetch deleted rooms", error.code);
    }
    return (data || []).map(SettingsMapper.toRoomEntity);
  }

  /**
   * Restores a soft-deleted room.
   */
  public async restoreRoom(roomNumber: string): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({
        deleted_at: null,
        deleted_by: null,
        delete_reason: null
      })
      .eq("room_number", roomNumber);

    if (error) {
      throw new DatabaseError(`Failed to restore room: ${roomNumber}`, error.code);
    }
  }

  /**
   * Permanently purges a room.
   */
  public async purgeRoom(roomNumber: string): Promise<void> {
    const { error } = await supabase.from("rooms").delete().eq("room_number", roomNumber);
    if (error) {
      throw new DatabaseError(`Failed to permanently purge room ${roomNumber}`, error.code);
    }
  }

  /**
   * Modifies an existing room record specifications.
   */
  public async updateRoom(oldRoomNumber: string, dto: CreateRoomDTO): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({
        room_number: dto.roomNumber,
        room_type_id: dto.roomType,
        status: dto.status,
        updated_at: new Date().toISOString()
      })
      .eq("room_number", oldRoomNumber);

    if (error) {
      throw new DatabaseError(`Failed to update room specifications for ${oldRoomNumber}`, error.code);
    }
  }

  /**
   * Wipes all room types and rooms configurations.
   */
  public async clearAllRoomTypes(): Promise<void> {
    const { error } = await supabase.from("room_types").delete().neq("id", "placeholder_never_match");
    if (error) {
      throw new DatabaseError("Failed to clear room types from database", error.code);
    }
  }

  /**
   * Seeds default room types and rooms.
   */
  public async seedInitialData(roomTypes: any[], rooms: any[]): Promise<void> {
    const { error: typeErr } = await supabase.from("room_types").insert(roomTypes);
    if (typeErr) throw new DatabaseError("Seeding: failed to write room types", typeErr.code);

    const { error: roomErr } = await supabase.from("rooms").insert(rooms);
    if (roomErr) throw new DatabaseError("Seeding: failed to write rooms list", roomErr.code);
  }
}
