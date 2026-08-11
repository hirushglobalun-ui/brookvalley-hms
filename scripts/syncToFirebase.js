import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Read .env.local manually to get Supabase and Firebase credentials
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  const index = trimmed.indexOf('=');
  if (index > 0) {
    const key = trimmed.slice(0, index).trim();
    const val = trimmed.slice(index + 1).trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const firebaseConfig = {
  apiKey: envVars['NEXT_PUBLIC_FIREBASE_API_KEY'],
  authDomain: envVars['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'],
  projectId: envVars['NEXT_PUBLIC_FIREBASE_PROJECT_ID'],
  storageBucket: envVars['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: envVars['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'],
  appId: envVars['NEXT_PUBLIC_FIREBASE_APP_ID'],
  measurementId: envVars['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID']
};

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase credentials missing in .env.local');
  process.exit(1);
}

console.log(`🔥 Initializing Firebase Project: ${firebaseConfig.projectId}`);
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const tables = ['profiles', 'employees', 'room_types', 'rooms', 'bookings', 'activity_logs'];

async function fetchSupabaseTable(table) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`⚠️ Warning fetching ${table} from Supabase:`, err.message);
    return [];
  }
}

async function syncToFirebase() {
  console.log('\n🚀 Starting full sync from Supabase ➡️ Firebase Firestore...\n');

  let totalSynced = 0;

  for (const table of tables) {
    console.log(`📦 Reading Supabase table: ${table}...`);
    const records = await fetchSupabaseTable(table);
    console.log(`   └─ Found ${records.length} records in Supabase.`);

    for (const record of records) {
      // Determine document ID
      const docId = String(record.id || record.room_number || record.booking_id || record.employee_id || record.email || Math.random());
      try {
        const docRef = doc(db, table, docId);
        await setDoc(docRef, { ...record, _syncedAt: new Date().toISOString() }, { merge: true });
        totalSynced++;
      } catch (err) {
        console.warn(`   └─ ⚠️ Failed to sync document ${table}/${docId}:`, err.message);
      }
    }

    if (records.length > 0) {
      console.log(`   └─ ✅ Synced ${records.length} records into Firebase collection "${table}".`);
    }
  }

  console.log(`\n🎉 FIREBASE SYNC COMPLETED SUCCESSFULLY! Total ${totalSynced} records synced to Firebase.`);
  process.exit(0);
}

syncToFirebase();
