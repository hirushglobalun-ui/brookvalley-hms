import React from "react";
import { Skeleton, SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header bar skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Skeleton width={220} height={28} />
          <Skeleton width={320} height={14} />
        </div>
        <Skeleton width={130} height={40} borderRadius={10} />
      </div>

      {/* 4 Stats Cards Skeleton */}
      <div className="grid-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card stat-card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
            <Skeleton width={48} height={48} borderRadius={12} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
              <Skeleton width="60%" height={24} />
              <Skeleton width="80%" height={12} />
            </div>
          </div>
        ))}
      </div>

      {/* Content Table Skeleton */}
      <SkeletonTable columns={6} rows={5} />
    </div>
  );
}
