import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where,
  setDoc,
} from "firebase/firestore";
import { db, getCurrentUser, setItineraryShare } from "./firebase";

const col = collection(db, "itineraries");
const users = collection(db, "users");

export async function getAccessProfile(uid) {
  const snap = await getDoc(doc(users, uid));
  return snap.exists() ? snap.data() : null;
}

export async function requestAccess(user) {
  const ref = doc(users, user.uid);
  const profile = await getDoc(ref);
  const request = {
    uid: user.uid,
    email: user.email?.toLowerCase() || "",
    displayName: user.displayName || "",
    status: "pending",
    requestedAt: serverTimestamp(),
  };
  if (profile.exists()) await setDoc(ref, request, { merge: true });
  else await setDoc(ref, request);
}

export async function listAccessRequests() {
  const snap = await getDocs(query(users, where("status", "==", "pending")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function reviewAccess(uid, approved) {
  const user = getCurrentUser();
  await updateDoc(doc(users, uid), {
    status: approved ? "approved" : "rejected",
    ...(approved ? { role: "general" } : {}),
    reviewedAt: serverTimestamp(),
    reviewedBy: user.email,
  });
}

export async function listItineraries() {
  const user = getCurrentUser();
  const [owned, shared] = await Promise.all([
    getDocs(query(col, where("uid", "==", user.uid))),
    getDocs(query(col, where("sharedWithUids", "array-contains", user.uid))),
  ]);
  const unique = new Map([...owned.docs, ...shared.docs].map((d) => [d.id, { id: d.id, ...d.data(), isOwner: d.data().uid === user.uid }]));
  return [...unique.values()]
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
}

export async function getItinerary(id) {
  const snap = await getDoc(doc(db, "itineraries", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createItinerary(inputs, plan) {
  const user = getCurrentUser();
  const ref = await addDoc(col, {
    uid: user.uid,
    author: { uid: user.uid, name: user.displayName || "", email: user.email || "" },
    title: plan.title || `${inputs.destination} trip`,
    inputs,
    plan,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function copyItinerary(source) {
  const user = getCurrentUser();
  const ref = await addDoc(col, {
    uid: user.uid,
    author: { uid: user.uid, name: user.displayName || "", email: user.email || "" },
    copiedFrom: { id: source.id, author: source.author?.name || source.author?.email || "Unknown author" },
    title: `${source.plan?.title || source.title} (copy)`,
    inputs: source.inputs || {},
    plan: { ...source.plan, title: `${source.plan?.title || source.title} (copy)` },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function shareItinerary(id, email, shouldShare) {
  const sharedWithEmails = await setItineraryShare(id, email, shouldShare);
  return sharedWithEmails;
}

export const updateItinerary = (id, plan) =>
  updateDoc(doc(db, "itineraries", id), { plan, title: plan.title, updatedAt: serverTimestamp() });

export const deleteItinerary = (id) => deleteDoc(doc(db, "itineraries", id));

// Case-insensitive match across title, destination, trip details, places and restaurants.
export function matches(it, q) {
  if (!q.trim()) return true;
  const i = it.inputs || {};
  const hay = [
    it.title, i.destination, i.mode, i.tripType, i.food, i.startDate,
    ...(it.plan?.places || []).map((p) => p.name),
    ...(it.plan?.restaurants || []).flatMap((r) => [r.name, r.cuisine]),
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
