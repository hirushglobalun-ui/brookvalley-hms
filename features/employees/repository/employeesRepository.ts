import { supabase } from "../../../lib/supabase";
import { DatabaseError } from "../../../shared/errors";
import { EmployeeEntity } from "../domain/employees.domain";
import { CreateEmployeeDTO, UpdateEmployeeDTO, EmployeeMapper } from "../dto/employees.dto";

/**
 * Repository class wrapping database operations for employees.
 */
export class EmployeesRepository {
  /**
   * Retrieves all employee records.
   */
  public async getEmployees(): Promise<EmployeeEntity[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new DatabaseError("Failed to fetch employees", error.code);
    }
    
    return (data || []).map(EmployeeMapper.toEntity);
  }

  /**
   * Retrieves a single employee by user profile UID.
   */
  public async getEmployeeByUid(uid: string): Promise<EmployeeEntity | null> {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch employee by UID: ${uid}`, error.code);
    }
    
    return data ? EmployeeMapper.toEntity(data) : null;
  }

  /**
   * Registers a new employee using the custom Supabase RPC function.
   * This handles both authentication account creation and profiles creation.
   */
  public async addEmployee(dto: CreateEmployeeDTO, password: string): Promise<string> {
    const { data, error } = await supabase.rpc("create_employee_user", {
      p_email: dto.email,
      p_password: password,
      p_full_name: dto.fullName,
      p_phone: dto.phone,
      p_role: dto.role,
      p_status: dto.status,
      p_joined_date: dto.joinedDate,
      p_notes: dto.notes || ""
    });

    if (error) {
      console.error("RPC Error Details:", error);
      throw new DatabaseError(error.message || "Failed to create employee user through RPC", error.code);
    }
    return data as string;
  }

  /**
   * Modifies the active status of an employee.
   */
  public async updateEmployeeStatus(employeeId: string, uid: string, status: "active" | "inactive"): Promise<void> {
    const { error: empError } = await supabase
      .from("employees")
      .update({ status })
      .eq("employee_id", employeeId);

    if (empError) {
      throw new DatabaseError(`Failed to update employee status: ${employeeId}`, empError.code);
    }

    const { error: profError } = await supabase
      .from("profiles")
      .update({ status })
      .eq("id", uid);

    if (profError) {
      throw new DatabaseError(`Failed to update profile status: ${uid}`, profError.code);
    }
  }

  /**
   * Modifies basic employee profiles.
   */
  public async updateEmployeeDetails(employeeId: string, uid: string, dto: UpdateEmployeeDTO): Promise<void> {
    const { error: empError } = await supabase
      .from("employees")
      .update({
        full_name: dto.fullName,
        phone: dto.phone,
        role: dto.role,
        notes: dto.notes || ""
      })
      .eq("employee_id", employeeId);

    if (empError) {
      throw new DatabaseError(`Failed to update employee record: ${employeeId}`, empError.code);
    }

    const { error: profError } = await supabase
      .from("profiles")
      .update({
        full_name: dto.fullName,
        phone: dto.phone,
        role: dto.role
      })
      .eq("id", uid);

    if (profError) {
      throw new DatabaseError(`Failed to update profile record: ${uid}`, profError.code);
    }
  }

  /**
   * Deletes an employee using the database RPC.
   */
  public async deleteEmployee(uid: string): Promise<void> {
    const { error } = await supabase.rpc("delete_employee_user", {
      p_uid: uid
    });

    if (error) {
      throw new DatabaseError(`Failed to delete employee account user: ${uid}`, error.code);
    }
  }

  /**
   * Wipes all employee profiles except the administrative user triggering the wipe.
   */
  public async clearAllEmployees(adminUid: string): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .neq("id", adminUid)
      .neq("role", "admin");

    if (error) {
      throw new DatabaseError("Failed to clear employee records from database", error.code);
    }
  }

  /**
   * Seeds an administrator user profiles.
   */
  public async createFirstAdminUser(uid: string, email: string, fullName: string, joinedDate: string): Promise<void> {
    const profileData = {
      id: uid,
      full_name: fullName,
      email: email,
      phone: "+1 555-0199",
      role: "admin",
      status: "active"
    };

    const employeeData = {
      employee_id: "EMP888888",
      user_id: uid,
      full_name: fullName,
      email: email,
      phone: "+1 555-0199",
      role: "admin",
      status: "active",
      joined_date: joinedDate,
      notes: "System Administrator"
    };

    const { error: profErr } = await supabase.from("profiles").upsert(profileData);
    if (profErr) throw new DatabaseError("Seeding: failed to write profile", profErr.code);

    const { error: empErr } = await supabase.from("employees").upsert(employeeData);
    if (empErr) throw new DatabaseError("Seeding: failed to write employee", empErr.code);
  }
}
