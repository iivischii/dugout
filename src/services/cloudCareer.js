import { collection, doc, getDoc, getDocs, runTransaction, writeBatch } from "firebase/firestore/lite";
import { auth, db } from "./firebase";

function owner(uid) {
  if (!uid || auth.currentUser?.uid !== uid) throw new Error("Please sign in to this account again.");
}

export async function loadCloudCareer(uid) {
  owner(uid);
  const profile = await getDoc(doc(db, "careers", uid));
  if (!profile.exists()) return null;
  const records = await getDocs(collection(db, "careers", uid, "matches"));
  owner(uid);
  return {
    managerName: profile.data().managerName,
    matches: records.docs.map(record => record.data()).sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}

export async function saveCloudCareer(uid, career) {
  owner(uid);
  if (!career.managerName.trim()) throw new Error("Create your manager before saving a cloud career.");
  const profileRef = doc(db, "careers", uid);
  // A transaction keeps the original manager identity when devices save together.
  await runTransaction(db, async transaction => {
    const existing = await transaction.get(profileRef);
    if (existing.exists() && existing.data().managerName !== career.managerName) {
      throw new Error("This account already has a different manager. Load that cloud career first.");
    }
    if (!existing.exists()) transaction.set(profileRef, { managerName: career.managerName });
  });
  const existing = await getDocs(collection(db, "careers", uid, "matches"));
  const ids = new Set(existing.docs.map(record => record.id));
  const missing = career.matches.filter(match => !ids.has(match.id));
  // Each match has its own document, avoiding one ever-growing career document.
  for (let offset = 0; offset < missing.length; offset += 400) {
    owner(uid);
    const batch = writeBatch(db);
    for (const match of missing.slice(offset, offset + 400)) {
      batch.set(doc(db, "careers", uid, "matches", match.id), JSON.parse(JSON.stringify(match)));
    }
    await batch.commit();
  }
  owner(uid);
}
