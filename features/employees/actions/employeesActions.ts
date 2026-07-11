"use server";

import { EmployeesService } from "../services/employeesService";
import { CreateEmployeeDTO, UpdateEmployeeDTO } from "../dto/employees.dto";
import { revalidatePath } from "next/cache";

const service = new EmployeesService();

/**
 * Server Action: Registers a new employee user credentials and profile records.
 */
export async function addEmployeeAction(dto: CreateEmployeeDTO, password: string, adminUser: any) {
  const empId = await service.addEmployee(dto, password, adminUser);
  revalidatePath("/employees");
  return empId;
}

/**
 * Server Action: Modifies employee activation status.
 */
export async function updateEmployeeStatusAction(employeeId: string, uid: string, status: "active" | "inactive", adminUser: any) {
  await service.updateEmployeeStatus(employeeId, uid, status, adminUser);
  revalidatePath("/employees");
}

/**
 * Server Action: Modifies basic employee profiles.
 */
export async function updateEmployeeDetailsAction(employeeId: string, uid: string, dto: UpdateEmployeeDTO, adminUser: any) {
  await service.updateEmployeeDetails(employeeId, uid, dto, adminUser);
  revalidatePath("/employees");
}

/**
 * Server Action: Deletes an employee user account.
 */
export async function deleteEmployeeAction(employeeId: string, uid: string, adminUser: any) {
  await service.deleteEmployee(employeeId, uid, adminUser);
  revalidatePath("/employees");
}

/**
 * Server Action: Wipes all employee records.
 */
export async function clearAllEmployeesAction(adminUser: any) {
  await service.clearAllEmployees(adminUser);
  revalidatePath("/employees");
}
