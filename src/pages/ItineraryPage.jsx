import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Loader2, Pencil, Printer, Save, Share2, Trash2, UserPlus, X } from "lucide-react";
import { getCurrentUser } from "../firebase";
import { copyItinerary, deleteItinerary, getItinerary, shareItinerary, updateItinerary } from "../store";
import ItineraryDisplay from "../components/ItineraryDisplay";

export default function ItineraryPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [it, setIt] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    getItinerary(id)
      .then((r) => { if (r) { setIt({ ...r, isOwner: r.uid === getCurrentUser().uid }); document.title = `${r.title} - Wanderly`; } else setError("Itinerary not found."); })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</p>;
  if (!it) return <Loader2 className="mx-auto h-6 w-6 text-teal-700 motion-safe:animate-spin" role="status" aria-label="Loading itinerary" />;

  const save = async () => {
    try {
      await updateItinerary(id, draft);
      setIt({ ...it, plan: draft, title: draft.title });
      setDraft(null);
      setMsg("Changes saved.");
    } catch (e) { setError(e.message); }
  };
  const remove = async () => {
    if (!confirm(`Delete "${it.title}"? This cannot be undone.`)) return;
    await deleteItinerary(id);
    nav("/");
  };

  const changeShare = async (email, shouldShare) => {
    setSharing(true); setError(""); setMsg("");
    try {
      const emails = await shareItinerary(id, email, shouldShare);
      setIt({ ...it, sharedWithEmails: emails });
      setShareEmail("");
      setMsg(shouldShare ? `Shared with ${email}.` : `Removed ${email}'s access.`);
    } catch (e) { setError(e.message || "Could not update sharing."); }
    finally { setSharing(false); }
  };

  const makeCopy = async () => {
    setCopying(true); setError("");
    try { nav(`/itinerary/${await copyItinerary(it)}`); }
    catch (e) { setError(e.message || "Could not copy this itinerary."); setCopying(false); }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="link inline-flex min-h-11 items-center gap-1.5"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All itineraries</Link>
        <div className="flex flex-wrap gap-3">
          {draft ? (
            <>
              <button type="button" className="btn-primary" onClick={save}><Save className="h-4 w-4" aria-hidden="true" />Save changes</button>
              <button type="button" className="btn-secondary" onClick={() => setDraft(null)}><X className="h-4 w-4" aria-hidden="true" />Cancel</button>
            </>
          ) : (
            <>
              {it.isOwner ? <button type="button" className="btn-primary" onClick={() => { setMsg(""); setDraft(it.plan); }}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                : <button type="button" className="btn-primary" onClick={makeCopy} disabled={copying}><Pencil className="h-4 w-4" aria-hidden="true" />{copying ? "Copying..." : "Copy and customize"}</button>}
              <button type="button" className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print</button>
              <button type="button" className="btn-secondary" onClick={() => window.print()}><FileDown className="h-4 w-4" aria-hidden="true" />Save as PDF</button>
              {it.isOwner && <button type="button" className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>}
            </>
          )}
        </div>
      </div>
      <p role="status" className="no-print text-sm font-medium text-teal-900">{msg}</p>
      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</p>}
      {it.isOwner && !draft && (
        <section className="no-print card space-y-4 p-5" aria-labelledby="share-heading">
          <div>
            <h2 id="share-heading" className="flex items-center gap-2 font-display text-xl font-semibold"><Share2 className="h-5 w-5 text-teal-800" aria-hidden="true" />Share this itinerary</h2>
            <p className="mt-1 text-sm text-slate-700">Only approved Wanderly users can be given access. They can view or make their own copy, but cannot edit yours.</p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); changeShare(shareEmail.trim(), true); }}>
            <label htmlFor="share-email" className="sr-only">Approved user's Google account email</label>
            <input id="share-email" type="email" required className="field flex-1" placeholder="name@example.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
            <button type="submit" className="btn-primary" disabled={sharing || !shareEmail.trim()}><UserPlus className="h-4 w-4" aria-hidden="true" />Share</button>
          </form>
          {!!it.sharedWithEmails?.length && (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {it.sharedWithEmails.map((email) => <li key={email} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span>{email}</span><button type="button" className="btn-danger !min-h-9 !px-3" disabled={sharing} onClick={() => changeShare(email, false)}>Remove access</button></li>)}
            </ul>
          )}
        </section>
      )}
      <ItineraryDisplay plan={draft || it.plan} inputs={it.inputs} author={it.author} copiedFrom={it.copiedFrom} editable={!!draft} onChange={setDraft} />
    </div>
  );
}
