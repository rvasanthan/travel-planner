import { useEffect, useState } from "react";
import { Check, Clock3, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { listAccessRequests, reviewAccess } from "../store";

export default function AdminPage() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = () => listAccessRequests().then(setRequests).catch((e) => setError(e.message));
  useEffect(() => { document.title = "Access requests - Wanderly"; refresh(); }, []);

  const decide = async (item, approved) => {
    setBusyId(item.id); setError(""); setNotice("");
    try {
      await reviewAccess(item.id, approved);
      setRequests((current) => current.filter((request) => request.id !== item.id));
      setNotice(`${item.email} ${approved ? "approved as a general user" : "rejected"}.`);
    } catch (e) { setError(e.message || "Could not update this request."); }
    finally { setBusyId(""); }
  };

  return (
    <section className="space-y-6">
      <header className="card bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6 sm:p-8">
        <p className="eyebrow flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Administration</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Access requests</h1>
        <p className="mt-2 text-slate-700">Review requests and grant general-user access to Wanderly.</p>
      </header>

      {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm font-medium text-teal-950">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</p>}
      {!requests && !error && <p role="status" className="flex items-center gap-2 text-sm text-slate-700"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />Loading requests...</p>}
      {requests?.length === 0 && <div className="card p-8 text-center"><Check className="mx-auto h-8 w-8 text-teal-700" aria-hidden="true" /><h2 className="mt-2 font-display text-xl font-semibold">All caught up</h2><p className="mt-1 text-sm text-slate-700">There are no pending access requests.</p></div>}

      {requests?.length > 0 && (
        <ul className="space-y-3">
          {requests.map((item) => (
            <li key={item.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800" aria-hidden="true"><UserRound className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-semibold text-slate-900">{item.displayName || "Google user"}</h2>
                  <p className="text-sm text-slate-700">{item.email}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />Requested {item.requestedAt?.toDate?.().toLocaleString() || "recently"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary" disabled={!!busyId} onClick={() => decide(item, true)}>
                  {busyId === item.id ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}Approve
                </button>
                <button type="button" className="btn-danger" disabled={!!busyId} onClick={() => decide(item, false)}>
                  <X className="h-4 w-4" aria-hidden="true" />Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
