import { RoomTypeEntity, RoomEntity } from "../domain/settings.domain";

/**
 * Data Transfer Object for creating a new Room Type.
 */
export interface CreateRoomTypeDTO {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description?: string;
}

/**
 * Data Transfer Object for updating an existing Room Type.
 */
export interface UpdateRoomTypeDTO {
  name: string;
  price: number;
  capacity: number;
  description?: string;
}

/**
 * Data Transfer Object for configuring a new Room.
 */
export interface CreateRoomDTO {
  roomNumber: string;
  roomType: string;
  status: "available" | "occupied" | "maintenance";
}

/**
 * Mapper utility to convert database rows and DTO payloads to Domain Entities.
 */
export class SettingsMapper {
  /**
   * Maps database raw room type row to RoomTypeEntity.
   */
  public static toRoomTypeEntity(row: any): RoomTypeEntity {
    return new RoomTypeEntity(
      row.id,
      row.name,
      Number(row.price),
      Number(row.capacity),
      row.description || ""
    );
  }

  /**
   * Maps database raw room row to RoomEntity.
   */
  public static toRoomEntity(row: any): RoomEntity {
    return new RoomEntity(
      row.room_number,
      row.room_type_id,
      row.status
    );
  }
}
