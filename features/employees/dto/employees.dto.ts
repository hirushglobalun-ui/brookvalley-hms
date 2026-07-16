import { EmployeeEntity } from "../domain/employees.domain";

/**
 * Payload interface for registering a new employee.
 */
export interface CreateEmployeeDTO {
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "employee" | "manager";
  status: "active" | "inactive";
  joinedDate: string;
  notes?: string;
}

/**
 * Payload interface for modifying details.
 */
export interface UpdateEmployeeDTO {
  fullName: string;
  phone: string;
  role: "admin" | "employee" | "manager";
  notes?: string;
}

/**
 * Maps database rows to structural Employee entities.
 */
export class EmployeeMapper {
  /**
   * Maps database raw employee row to EmployeeEntity.
   */
  public static toEntity(row: any): EmployeeEntity {
    return new EmployeeEntity(
      row.employee_id,
      row.employee_id,
      row.user_id,
      row.full_name,
      row.email,
      row.phone,
      row.role,
      row.status,
      row.joined_date,
      row.notes || ""
    );
  }
}
