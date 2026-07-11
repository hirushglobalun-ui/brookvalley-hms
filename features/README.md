# Feature-Based Architecture

This project organizes business domain logics, user interfaces, database mappings, and validation procedures using **Feature-Based Architecture**.

## Directory Layout

Each directory within `features/` isolates a specific module of the Brookvalley Hotel Management System (HMS):

```
features/
  <feature_name>/
    components/   # Presentational React view controllers and modal panels
    services/     # Stateful enterprise orchestration logic
    repository/   # Supabase DB operations and RLS compliance interfaces
    domain/       # Pure domain definitions (Entities, boundaries)
    dto/          # TypeScript contracts for cross-boundary data transfer
    actions/      # Next.js Server Actions for safe mutations
    schemas/      # Zod validation models
    index.ts      # Public API and barrel exports mapping
```

## Modular Guidelines

1. **High Cohesion, Low Coupling**: Features should minimize cross-imports. If a feature needs to invoke another feature's rules, it must do so strictly through its public export interfaces inside the destination feature's `index.ts`.
2. **Encapsulated Security**: Sensitive field masking, user permissions checks (`isOwner`), and audit log recording are delegated to the specific features to maintain uniform access controls.
