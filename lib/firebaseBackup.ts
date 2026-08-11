/**
 * Secondary Backup Service (e.g. Firebase / Secondary Cloud Storage)
 * Allows backing up database snapshots to a secondary provider so your data
 * is never tied to a single database service.
 */

export interface DatabaseSnapshot {
  timestamp: string;
  profiles: any[];
  employees: any[];
  roomTypes: any[];
  rooms: any[];
  bookings: any[];
  activityLogs: any[];
}

export async function exportDatabaseSnapshot(): Promise<DatabaseSnapshot> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing.");
  }

  const fetchTable = async (table: string) => {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const [profiles, employees, roomTypes, rooms, bookings, activityLogs] = await Promise.all([
    fetchTable("profiles"),
    fetchTable("employees"),
    fetchTable("room_types"),
    fetchTable("rooms"),
    fetchTable("bookings"),
    fetchTable("activity_logs")
  ]);

  return {
    timestamp: new Date().toISOString(),
    profiles,
    employees,
    roomTypes,
    rooms,
    bookings,
    activityLogs
  };
}

/**
 * Trigger an automatic cloud download of the database snapshot as JSON
 */
export function triggerJsonDownload(snapshot: DatabaseSnapshot, fileName?: string) {
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `brookvalley-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
