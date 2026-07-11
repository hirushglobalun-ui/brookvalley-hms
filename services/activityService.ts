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
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  return (data || []).map(mapActivityLogFromDb).filter((l): l is ActivityLog => l !== null);
};
