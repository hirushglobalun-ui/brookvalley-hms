import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { ActivityLog } from "../../../types";
import { getActivityLogs } from "../../../lib/db";
import { Skeleton } from "../../../components/ui/Skeleton";

interface ActivityLogsTabProps {
  user: any;
  onClearLogs: () => Promise<void>;
}

const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({ user, onClearLogs }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getActivityLogs(30);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load activity logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogsClick = async () => {
    await onClearLogs();
    fetchLogs(); // refresh local logs state after clear
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Skeleton width={200} height={24} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={32} borderRadius={6} />
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity size={18} className="text-primary" />
          <span>System Activity Logs</span>
        </h2>
        {user?.role === "admin" && (
          <button className="btn btn-danger btn-sm" onClick={handleClearLogsClick} style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
            Clear Logs
          </button>
        )}
      </div>
      <div className="table-wrapper">
        {logs.length > 0 ? (
          <table className="table-custom" style={{ fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const date = log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000) : new Date();
                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{log.userName}</td>
                    <td style={{ textTransform: "uppercase", fontSize: "0.75rem" }}>
                      <span className={`badge badge-${log.userRole === 'admin' ? 'danger' : log.userRole === 'manager' ? 'warning' : 'primary'}`} style={{ padding: "2px 6px" }}>
                        {log.userRole}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>{log.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-data" style={{ padding: "1.5rem" }}>No recent activity.</div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogsTab;
