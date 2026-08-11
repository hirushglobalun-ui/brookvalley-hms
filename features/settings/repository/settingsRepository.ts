import { supabase } from "../../../lib/supabase";
import { DatabaseError } from "../../../shared/errors";
import { RoomTypeEntity, RoomEntity } from "../domain/settings.domain";
import { CreateRoomTypeDTO, UpdateRoomTypeDTO, CreateRoomDTO, SettingsMapper } from "../dto/settings.dto";
import { syncToFirestore, deleteFromFirestore, fetchFallbackFromFirestore } from "../../../lib/firebase";

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
      .order("id");

    if (error) {
      console.warn("Supabase fetch failed, attempting Firebase fallback for room_types...");
      const fbData = await fetchFallbackFromFirestore("room_types");
      if (fbData.length > 0) return fbData.map(SettingsMapper.toRoomTypeEntity);
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
      console.warn("Supabase unavailable. Writing room_type to Firebase fallback...", error.message);
      await syncToFirestore("room_types", dto.id, dto);
      return;
    }

    // Dual-sync to Firebase background backup
    syncToFirestore("room_types", dto.id, dto).catch(console.error);
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
      console.warn("Supabase unavailable. Updating room_type in Firebase fallback...", error.message);
      await syncToFirestore("room_types", id, dto);
      return;
    }
  }

  /**
   * Deletes a room type record.
   */
  public async deleteRoomType(id: string, _reason: string = "Retired", _user: any = { uid: null }): Promise<void> {
    const { error } = await supabase.from("room_types").delete().eq("id", id);
    if (error) {
      console.warn("Supabase unavailable. Deleting room_type from Firebase fallback...", error.message);
      await deleteFromFirestore("room_types", id);
      return;
    }
    deleteFromFirestore("room_types", id).catch(console.error);
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
      return [];
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
        deleted_at: null
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
      console.warn("Supabase unavailable. Purging room_type from Firebase fallback...", error.message);
      await deleteFromFirestore("room_types", id);
      return;
    }
    deleteFromFirestore("room_types", id).catch(console.error);
  }

  /**
   * Retrieves all configured rooms.
   */
  public async getRooms(): Promise<RoomEntity[]> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("room_number");

    if (error) {
      console.warn("Supabase fetch failed, attempting Firebase fallback for rooms...");
      const fbData = await fetchFallbackFromFirestore("rooms");
      if (fbData.length > 0) return fbData.map(SettingsMapper.toRoomEntity);
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
      console.warn("Supabase unavailable. Writing room to Firebase fallback...", error.message);
      await syncToFirestore("rooms", dto.roomNumber, dto);
      return;
    }

    syncToFirestore("rooms", dto.roomNumber, dto).catch(console.error);
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
      console.warn("Supabase unavailable. Updating room status in Firebase fallback...", error.message);
      await syncToFirestore("rooms", roomNumber, { room_number: roomNumber, status, updated_at: new Date().toISOString() });
      return;
    }

    syncToFirestore("rooms", roomNumber, { room_number: roomNumber, status, updated_at: new Date().toISOString() }).catch(console.error);
  }

  /**
   * Deletes a room config.
   */
  public async deleteRoom(roomNumber: string, _reason: string = "Retired", _user: any = { uid: null }): Promise<void> {
    const { error } = await supabase.from("rooms").delete().eq("room_number", roomNumber);
    if (error) {
      console.warn("Supabase unavailable. Deleting room from Firebase fallback...", error.message);
      await deleteFromFirestore("rooms", roomNumber);
      return;
    }

    deleteFromFirestore("rooms", roomNumber).catch(console.error);
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
