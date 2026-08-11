import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

export const firebaseApp = isFirebaseConfigured
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : null;

export const dbFirestore = firebaseApp ? getFirestore(firebaseApp) : null;

/**
 * Dual-sync record to Firestore as a secondary backup.
 * Non-blocking so Supabase primary flow is never delayed.
 */
export async function syncToFirestore(collectionName: string, docId: string, data: any) {
  if (!dbFirestore) return;
  try {
    const docRef = doc(dbFirestore, collectionName, String(docId));
    await setDoc(docRef, { ...data, _lastSyncedAt: new Date().toISOString() }, { merge: true });
    console.log(`🔥 [Firebase Sync] Synced ${collectionName}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firebase Sync Warning] Could not sync ${collectionName}/${docId}:`, err);
  }
}

/**
 * Dual-delete record from Firestore.
 */
export async function deleteFromFirestore(collectionName: string, docId: string) {
  if (!dbFirestore) return;
  try {
    const docRef = doc(dbFirestore, collectionName, String(docId));
    await deleteDoc(docRef);
    console.log(`🔥 [Firebase Sync] Deleted ${collectionName}/${docId}`);
  } catch (err) {
    console.warn(`⚠️ [Firebase Sync Warning] Could not delete ${collectionName}/${docId}:`, err);
  }
}

/**
 * Fallback fetch from Firestore if Supabase goes offline / pauses.
 */
export async function fetchFallbackFromFirestore(collectionName: string): Promise<any[]> {
  if (!dbFirestore) return [];
  try {
    const querySnapshot = await getDocs(collection(dbFirestore, collectionName));
    const list: any[] = [];
    querySnapshot.forEach((d) => {
      list.push({ ...d.data(), id: d.id });
    });
    return list;
  } catch (err) {
    console.warn(`⚠️ [Firebase Fallback Error] Could not fetch ${collectionName}:`, err);
    return [];
  }
}
