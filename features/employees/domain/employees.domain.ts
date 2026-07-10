import { ValidationError } from "../../../shared/errors";

/**
 * Domain entity representing an Employee.
 */
export class EmployeeEntity {
  public readonly id: string;
  public readonly employeeId: string;
  public readonly uid: string;
  public readonly fullName: string;
  public readonly email: string;
  public readonly phone: string;
  public readonly role: "admin" | "employee";
  public readonly status: "active" | "inactive";
  public readonly joinedDate: string;
  public readonly notes: string;

  constructor(
    id: string,
    employeeId: string,
    uid: string,
    fullName: string,
    email: string,
    phone: string,
    role: "admin" | "employee",
    status: "active" | "inactive",
    joinedDate: string,
    notes = ""
  ) {
    this.id = id;
    this.employeeId = employeeId;
    this.uid = uid;
    this.fullName = fullName;
    this.email = email;
    this.phone = phone;
    this.role = role;
    this.status = status;
    this.joinedDate = joinedDate;
    this.notes = notes;
    this.validate();
  }

  /**
   * Validates internal business constraints for employee records.
   * 
   * @throws ValidationError if validation checks fail.
   */
  public validate(): void {
    if (!this.fullName || this.fullName.trim() === "") {
      throw new ValidationError("Employee Full Name is required.");
    }
    if (!this.email || !this.email.includes("@")) {
      throw new ValidationError("A valid login email address is required.");
    }
    const cleanPhone = this.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      throw new ValidationError("Phone number must be exactly 10 digits.");
    }
  }
}
