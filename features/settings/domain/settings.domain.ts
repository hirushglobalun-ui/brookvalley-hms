import { ValidationError } from "../../../shared/errors";

/**
 * Domain entity representing a Room Type.
 */
export class RoomTypeEntity {
  public readonly id: string;
  public readonly name: string;
  public readonly price: number;
  public readonly capacity: number;
  public readonly description: string;

  constructor(id: string, name: string, price: number, capacity: number, description = "") {
    this.id = id;
    this.name = name;
    this.price = price;
    this.capacity = capacity;
    this.description = description;
    this.validate();
  }

  /**
   * Validates internal business constraints for room types.
   * 
   * @throws ValidationError if validation checks fail.
   */
  public validate(): void {
    if (!this.id || this.id.trim() === "") {
      throw new ValidationError("Room Type ID must be a non-empty string.");
    }
    if (!this.name || this.name.trim() === "") {
      throw new ValidationError("Display Name must be a non-empty string.");
    }
    if (this.price < 0) {
      throw new ValidationError("Base Price per Night cannot be negative.");
    }
    if (this.capacity < 1) {
      throw new ValidationError("Standard Capacity must be at least 1 guest.");
    }
  }
}

/**
 * Domain entity representing a physical Room.
 */
export class RoomEntity {
  public readonly roomNumber: string;
  public readonly roomType: string;
  public readonly status: "available" | "occupied" | "maintenance";

  constructor(roomNumber: string, roomType: string, status: "available" | "occupied" | "maintenance") {
    this.roomNumber = roomNumber;
    this.roomType = roomType;
    this.status = status;
    this.validate();
  }

  /**
   * Validates internal business constraints for rooms.
   * 
   * @throws ValidationError if validation checks fail.
   */
  public validate(): void {
    if (!this.roomNumber || this.roomNumber.trim() === "") {
      throw new ValidationError("Room number must be a non-empty string.");
    }
    if (!this.roomType || this.roomType.trim() === "") {
      throw new ValidationError("Room Type assignment must be specified.");
    }
  }
}
