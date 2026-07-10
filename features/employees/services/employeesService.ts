import { EmployeesRepository } from "../repository/employeesRepository";
import { CreateEmployeeDTO, UpdateEmployeeDTO } from "../dto/employees.dto";
import { createEmployeeSchema, updateEmployeeSchema } from "../schemas/employees.schema";
import { Logger } from "../../../shared/logger/logger";
import { logActivity } from "../../../services/activityService";
import { ValidationError } from "../../../shared/errors";
import { Employee } from "../../../types";

const repo = new EmployeesRepository();

/**
 * Service orchestrating employee profiles configuration.
 */
export class EmployeesService {
  /**
   * Retrieves all registered employees.
   */
  public async getEmployees(): Promise<Employee[]> {
    const entities = await repo.getEmployees();
    return entities.map(e => ({
      id: e.id,
      employeeId: e.employeeId,
      uid: e.uid,
      fullName: e.fullName,
      email: e.email,
      phone: e.phone,
      role: e.role,
      status: e.status,
      joinedDate: e.joinedDate,
      notes: e.notes,
      createdAt: null // Format dates in mapping view if needed
    }));
  }

  /**
   * Retrieves a single employee profile.
   */
  public async getEmployeeByUid(uid: string): Promise<Employee | null> {
    const e = await repo.getEmployeeByUid(uid);
    if (!e) return null;
    return {
      id: e.id,
      employeeId: e.employeeId,
      uid: e.uid,
      fullName: e.fullName,
      email: e.email,
      phone: e.phone,
      role: e.role,
      status: e.status,
      joinedDate: e.joinedDate,
      notes: e.notes,
      createdAt: null
    };
  }

  /**
   * Creates a new employee staff account.
   */
  public async addEmployee(dto: CreateEmployeeDTO, password: string, adminUser: any): Promise<string> {
    const parse = createEmployeeSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid Employee specs", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Registering new employee account", { email: dto.email, creator: adminUser?.email });
    const empId = await repo.addEmployee(dto, password);
    await logActivity("CREATE_EMPLOYEE", `Created employee ${dto.fullName} (${dto.role})`, adminUser);
    return empId;
  }

  /**
   * Toggles employment active status status.
   */
  public async updateEmployeeStatus(employeeId: string, uid: string, status: "active" | "inactive", adminUser: any): Promise<void> {
    Logger.warn("Changing employee account activation status", { employeeId, uid, status, actor: adminUser?.email });
    await repo.updateEmployeeStatus(employeeId, uid, status);
    await logActivity("UPDATE_EMPLOYEE_STATUS", `Updated status of employee ${employeeId} to ${status}`, adminUser);
  }

  /**
   * Updates details of an employee profile.
   */
  public async updateEmployeeDetails(employeeId: string, uid: string, dto: UpdateEmployeeDTO, adminUser: any): Promise<void> {
    const parse = updateEmployeeSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid details payload", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Modifying employee details", { employeeId, actor: adminUser?.email });
    await repo.updateEmployeeDetails(employeeId, uid, dto);
    await logActivity("UPDATE_EMPLOYEE", `Updated employee ${dto.fullName} details`, adminUser);
  }

  /**
   * Deletes an employee account.
   */
  public async deleteEmployee(employeeId: string, uid: string, adminUser: any): Promise<void> {
    Logger.error("Deleting employee user account", undefined, { employeeId, uid, actor: adminUser?.email });
    await repo.deleteEmployee(uid);
    await logActivity("DELETE_EMPLOYEE", `Deleted employee account ${employeeId}`, adminUser);
  }

  /**
   * Wipes all employees.
   */
  public async clearAllEmployees(adminUser: any): Promise<void> {
    Logger.error("Wiping all employee records", undefined, { actor: adminUser?.email });
    await repo.clearAllEmployees(adminUser.uid);
    await logActivity("CLEAR_ALL_EMPLOYEES", "Cleared all employee records (excluding self)", adminUser);
  }

  /**
   * Initializes the first system admin.
   */
  public async createFirstAdminUser(uid: string, email: string, fullName: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    Logger.info("Creating primary administrator account", { email });
    await repo.createFirstAdminUser(uid, email, fullName, today);
  }
}
