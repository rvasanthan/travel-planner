import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, indexedDBLocalPersistence, initializeAuth, signInWithCredential, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = getFirestore(app);
const fns = getFunctions(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = async () => {
  if (!Capacitor.isNativePlatform()) return signInWithPopup(auth, googleProvider);
  const result = await FirebaseAuthentication.signInWithGoogle();
  const credential = GoogleAuthProvider.credential(result.credential?.idToken);
  return signInWithCredential(auth, credential);
};

export const signOutUser = async () => {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
  return signOut(auth);
};
export const isAdminUser = (user) =>
  user?.email?.toLowerCase() === "vasanth.ravindran@gmail.com" && user.emailVerified;

export function getCurrentUser() {
  if (!auth.currentUser) throw new Error("Sign in to continue.");
  return auth.currentUser;
}

export const generateItinerary = async (inputs) => {
  getCurrentUser();
  const { data } = await httpsCallable(fns, "generateItinerary")(inputs);
  return data.plan;
};

export const setItineraryShare = async (itineraryId, email, shouldShare) => {
  const { data } = await httpsCallable(fns, "setItineraryShare")({ itineraryId, email, shouldShare });
  return data.sharedWithEmails;
};
