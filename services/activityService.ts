import { supabase } from "../lib/supabase";
import { ActivityLog } from "../types";

/**
 * Maps a database activity log record to the strict TypeScript interface.
 * 
 * @param log - The raw database record.
 * @returns The formatted ActivityLog object or null.
 */
export const mapActivityLogFromDb = (log: any): ActivityLog | null => {
  if (!log) return null;
  const date = new Date(log.created_at);
  return {
    id: log.id,
    action: log.action,
    details: log.details,
    userId: log.user_id,
    userName: log.user_name,
    userRole: log.user_role,
    createdAt: log.created_at ? {
      seconds: Math.floor(date.getTime() / 1000),
      toDate: () => date
    } : null
  };
};

let cachedLogs: { data: ActivityLog[], timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Creates an activity log entry in the database.
 * 
 * @param action - The action identifier string.
 * @param details - Contextual details of the action.
 * @param user - The active user profile triggering the action.
 * @returns A promise that resolves when the log is written.
 */
export const logActivity = async (action: string, details: string, user: any): Promise<void> => {
  try {
    await supabase.from("activity_logs").insert({
      action,
      details,
      user_id: user?.uid || null,
      user_name: user?.fullName || user?.email || "System",
      user_role: user?.role || "system"
    });
    cachedLogs = null;
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};

/**
 * Fetches recent activity logs from the database.
 * 
 * @param limitCount - Maximum number of logs to fetch (default: 10).
 * @returns A promise resolving to an array of ActivityLog objects.
 */
export const getActivityLogs = async (limitCount = 10): Promise<ActivityLog[]> => {
  if (cachedLogs && Date.now() - cachedLogs.timestamp < CACHE_TTL && cachedLogs.data.length >= limitCount) {
    return cachedLogs.data.slice(0, limitCount);
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  const result = (data || []).map(mapActivityLogFromDb).filter((l): l is ActivityLog => l !== null);
  
  if (limitCount === 10 || limitCount === 15) {
    cachedLogs = { data: result, timestamp: Date.now() };
  }
  
  return result;
};

/**
 * Permanently deletes all activity logs from the database.
 * Writes a final audit log for the action.
 * 
 * @param adminUser - The active user profile triggering the action.
 * @returns A promise that resolves when the logs are cleared.
 */
export const clearAllLogs = async (adminUser: any): Promise<void> => {
  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    throw new Error(`Failed to clear activity logs: ${error.message}`);
  }

  cachedLogs = null;
  // Record the log clearing action
  await logActivity("CLEAR_ALL_LOGS", "Permanently cleared all activity logs", adminUser);
};
