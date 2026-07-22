import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  style,
  width,
  height,
  borderRadius,
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        borderRadius: borderRadius !== undefined ? borderRadius : undefined,
        ...style,
      }}
    />
  );
};

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="skeleton-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Skeleton width="40%" height={20} />
      <Skeleton width="20%" height={32} borderRadius={8} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} />
        </div>
        <Skeleton width="15%" height={24} borderRadius={6} />
      </div>
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ columns?: number; rows?: number }> = ({
  columns = 5,
  rows = 6,
}) => (
  <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
      <Skeleton width="30%" height={22} />
      <Skeleton width="120px" height={36} borderRadius={8} />
    </div>
    <div style={{ display: "flex", gap: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} style={{ flex: 1 }} height={16} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rIndex) => (
      <div key={rIndex} style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "0.65rem 0" }}>
        {Array.from({ length: columns }).map((_, cIndex) => (
          <Skeleton key={cIndex} style={{ flex: 1 }} height={14} />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
