import { useState } from "react";
import { CheckCircle2, Clock3, Compass, LogIn, ShieldAlert, XCircle } from "lucide-react";
import { isAdminUser, signInWithGoogle } from "../firebase";
import { requestAccess } from "../store";

export default function AccessPage({ user, profile, loading, authError, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const admin = isAdminUser(user);

  const request = async () => {
    setBusy(true); setError("");
    try { await requestAccess(user); await onRefresh(); }
    catch (e) { setError(e.message || "Could not submit access request."); }
    finally { setBusy(false); }
  };

  const signIn = async () => {
    setError("");
    try { await signInWithGoogle(); }
    catch (e) { setError(e.message || "Google sign-in failed."); }
  };

  return (
    <section className="card mx-auto max-w-xl p-7 text-center sm:p-10 motion-safe:animate-fade-up">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-700 text-white" aria-hidden="true"><Compass className="h-7 w-7" /></span>
      <p className="eyebrow mt-5">Wanderly account</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">{!user ? "Sign in to get started" : admin ? "Admin access" : profile?.status === "approved" ? "Access approved" : "Request access"}</h1>
      {!user ? (
        <>
          <p className="mt-3 text-slate-700">Sign in with Google to request access to travel planning.</p>
          <button type="button" className="btn-primary mt-6" onClick={signIn}><LogIn className="h-4 w-4" aria-hidden="true" />Continue with Google</button>
        </>
      ) : admin ? (
        <div className="mt-5 rounded-xl bg-teal-50 p-4 text-left text-sm text-teal-950">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />You have administrator access.</p>
          <p className="mt-1">Open Admin from the navigation to review access requests.</p>
        </div>
      ) : loading ? (
        <p role="status" className="mt-4 text-slate-700">Checking your access status...</p>
      ) : profile?.status === "approved" ? (
        <div className="mt-5 rounded-xl bg-teal-50 p-4 text-left text-sm text-teal-950">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />Your general account is approved.</p>
          <p className="mt-1">Reload the page to continue to Wanderly.</p>
          <button type="button" className="btn-secondary mt-4" onClick={onRefresh}>Continue</button>
        </div>
      ) : profile?.status === "pending" ? (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 text-left text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold"><Clock3 className="h-5 w-5" aria-hidden="true" />Your request is waiting for review.</p>
          <p className="mt-1">We’ll grant access after an administrator approves it.</p>
        </div>
      ) : profile?.status === "rejected" ? (
        <div className="mt-5 rounded-xl bg-rose-50 p-4 text-left text-sm text-rose-950">
          <p className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" aria-hidden="true" />Your previous request was not approved.</p>
          <button type="button" className="btn-secondary mt-4" onClick={request} disabled={busy}>{busy ? "Sending..." : "Request access again"}</button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-slate-700">Submit a request for an administrator to review. Your account will not be able to create itineraries until it is approved.</p>
          <button type="button" className="btn-primary mt-6" onClick={request} disabled={busy}>{busy ? "Sending request..." : "Request access"}</button>
        </>
      )}
      {(error || authError) && <p role="alert" className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-rose-800"><ShieldAlert className="h-4 w-4" aria-hidden="true" />{error || authError}</p>}
    </section>
  );
}
