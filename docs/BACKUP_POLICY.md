# Brookvalley HMS: Backup & Restore Policy

This document defines the data backup policy, automated snapshot schedules, security controls, and step-by-step restoration drills for the Brookvalley Hotel Management System (HMS) production database and assets.

---

## 1. Scope & Backup Assets

Operational safety requires backing up three distinct layers of the system:

### A. Database (Supabase PostgreSQL)
The core transactional database containing:
*   **Bookings**: Guest reservations, check-in/out logs, billing totals.
*   **Rooms / Room Types**: Inventory mappings, active statuses, configurations.
*   **Employees / Profiles**: Access roles, staff profiles, activity/audit logs.

### B. File Storage (Supabase Storage)
Sensitive documents uploaded via the application:
*   **Payment Proofs**: Bank transfer screenshots, receipts.
*   **Guest Identifications**: Uploaded guest IDs/passports (if applicable).
*   **Reports**: Exported financial reports and occupancy audits.

### C. Application Configurations
Critical operational parameters:
*   SQL schemas and migrations (`supabase/schema.sql`, migrations).
*   Environment configurations (excluding plain-text secret keys).
*   Seed scripts for bootstrapping environments.

---

## 2. Backup Schedules & Retention

We follow the standard **3-2-1 backup rule** (3 copies of data, 2 different media, 1 offsite).

| Backup Type | Trigger Frequency | Retention Period | Storage Target |
| :--- | :--- | :--- | :--- |
| **Daily Automated** | Every night at 02:00 UTC | **30 Days** | Dedicated secure Supabase Storage bucket |
| **Weekly Snapshot** | Every Sunday at 03:00 UTC | **90 Days** | Replicated offsite cold-storage (e.g. AWS S3 Glacier) |
| **Pre-Release Snapshot** | Manually before DDL updates | **Until release is stable** | Local secure developer environment |

---

## 3. Database Automated Backup Script

Automated backups are captured using standard PostgreSQL tools (`pg_dump`). Below is the standard script executed by the backup runner:

```bash
#!/bin/bash
# Brookvalley HMS Database Backup Script
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/brookvalley"
DB_NAME="postgres"
DB_USER="postgres"
DB_HOST="mdirwubiqfbpjqpnsfek.supabase.co"
DB_PORT="5432"
OUTPUT_FILE="$BACKUP_DIR/brookvalley_db_$TIMESTAMP.sql.gz"

echo "Starting database snapshot..."
mkdir -p "$BACKUP_DIR"

# Execute pg_dump compressing output on-the-fly
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -x --clean --if-exists | gzip > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successfully written to $OUTPUT_FILE"
  # Optional: Transfer file to secure cloud bucket
  # aws s3 cp "$OUTPUT_FILE" s3://brookvalley-backups/daily/
else
  echo "ERROR: Backup execution failed!"
  exit 1
fi
```

---

## 4. Step-by-Step Staging Restore Drill

**A backup is only as good as its tested restoration path.** Administrators must perform a database restoration drill at least once every quarter.

### Staging Recovery Steps:

1.  **Deploy a Staging Database Instance**
    Create a clean database container or secondary Supabase project. Do **not** run recovery against the active production database.
2.  **Retrieve the Backup SQL File**
    Download the target backup file from the storage bucket and unzip it:
    ```bash
    gunzip brookvalley_db_XXXXXXXX.sql.gz
    ```
3.  **Execute the SQL Dump**
    Run the pg_restore or direct psql execution pointing to the staging target:
    ```bash
    psql -h staging-db.supabase.co -U postgres -d postgres -f brookvalley_db_XXXXXXXX.sql
    ```
4.  **Perform Recovery Audits**
    Run validation queries on the restored database to assert data consistency:
    *   **Record Counts Check**:
        ```sql
        SELECT count(*) FROM public.bookings;
        SELECT count(*) FROM public.rooms;
        ```
    *   **Check Schema Cache Reload**:
        ```sql
        NOTIFY pgrst, 'reload schema';
        ```
5.  **Run Client Sanity Pass**
    Temporarily point the staging application build (`.env`) to the restored staging database URL and verify that bookings, rooms, and calendar dashboard render correctly with matching historical totals.
