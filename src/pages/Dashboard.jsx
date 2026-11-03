import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Car, Globe2, Loader2, MapPin, Plane, Plus, Search, Ticket, Train, Trash2, Utensils } from "lucide-react";
import { deleteItinerary, listItineraries, matches } from "../store";

const MODES = ["All", "Flight", "Drive", "Train"];
const MODE_ICON = { Flight: Plane, Drive: Car, Train: Train };
const TINTS = [
  "from-teal-100 to-sky-50", "from-amber-100 to-rose-50", "from-sky-100 to-indigo-50",
  "from-rose-100 to-amber-50", "from-emerald-100 to-teal-50",
];
const tint = (s = "") => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
const fmt = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-teal-800 shadow-sm" aria-hidden="true"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="font-display text-2xl font-semibold leading-none text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-700">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("All");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { document.title = "Dashboard - Wanderly"; listItineraries().then(setItems).catch((e) => setError(e.message)); }, []);

  const remove = async (it) => {
    if (!confirm(`Delete "${it.title}"? This cannot be undone.`)) return;
    await deleteItinerary(it.id);
    setItems((l) => l.filter((x) => x.id !== it.id));
    setNotice(`Deleted ${it.title}.`);
  };

  const shown = (items || []).filter((i) => matches(i, q) && (mode === "All" || i.inputs?.mode === mode));
  const totalDays = (items || []).reduce((a, i) => a + (Number(i.inputs?.days) || 0), 0);
  const places = new Set((items || []).map((i) => i.inputs?.destination?.toLowerCase()).filter(Boolean)).size;

  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden motion-safe:animate-fade-up">
        <div className="grid md:grid-cols-[1fr_17rem]">
          <div className="bg-gradient-to-br from-teal-50 via-white to-amber-50 px-6 py-10 sm:px-10">
            <p className="eyebrow flex items-center gap-2"><Ticket className="h-4 w-4" aria-hidden="true" />Boarding pass</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight sm:text-5xl">Where will you wander next?</h1>
            <p className="mt-3 max-w-lg text-base text-slate-700">Plan a trip in four easy steps, then keep every itinerary in one place.</p>
            <Link to="/new" className="btn-primary mt-6 transition hover:-translate-y-0.5 hover:shadow-lg">
              <Plane className="h-4 w-4 motion-safe:animate-bob" aria-hidden="true" />Plan a new trip
            </Link>
          </div>
          <div role="group" className="flex flex-col justify-center gap-5 border-t-2 border-dashed border-slate-300 bg-teal-50/70 px-8 py-8 md:border-l-2 md:border-t-0" aria-label="Your travel stats">
            <Stat icon={Ticket} value={items ? items.length : "-"} label="Trips planned" />
            <Stat icon={CalendarDays} value={items ? totalDays : "-"} label="Days of adventure" />
            <Stat icon={Globe2} value={items ? places : "-"} label="Destinations" />
          </div>
        </div>
      </section>

      <section aria-labelledby="list-h" className="space-y-5">
        <h2 id="list-h" className="font-display text-2xl font-semibold">Saved itineraries</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative flex-1">
            <label htmlFor="q" className="sr-only">Search itineraries by destination, food, trip type, place or restaurant</label>
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" aria-hidden="true" />
            <input id="q" type="search" className="field !pl-10" placeholder="Search destination, food, place or restaurant" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <fieldset>
            <legend className="sr-only">Filter by travel mode</legend>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {MODES.map((m) => {
                const Icon = MODE_ICON[m];
                return (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition ${mode === m ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                    {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}{m}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <p role="status" className="text-sm text-slate-700">
          {items ? `${shown.length} ${shown.length === 1 ? "itinerary" : "itineraries"}` : "Loading itineraries..."} {notice}
        </p>
        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</p>}
        {!items && !error && <Loader2 className="mx-auto h-6 w-6 text-teal-700 motion-safe:animate-spin" aria-hidden="true" />}

        {items && shown.length === 0 && (
          <div className="card p-10 text-center motion-safe:animate-fade-up">
            <Plane className="mx-auto h-10 w-10 text-teal-700 motion-safe:animate-bob" aria-hidden="true" />
            <p className="mt-3 font-semibold text-slate-900">{items.length ? "Nothing matches your search" : "Your passport is empty"}</p>
            <p className="mt-1 text-sm text-slate-700">{items.length ? "Try different keywords or clear the filter." : "Create your first plan in under a minute."}</p>
            {!items.length && <Link to="/new" className="btn-primary mt-5">Plan a trip</Link>}
          </div>
        )}

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it, n) => {
            const i = it.inputs || {};
            const ModeIcon = MODE_ICON[i.mode] || Plane;
            return (
              <li key={it.id} className="motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(n, 8) * 60}ms` }}>
                <article className="card group relative h-full overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className={`relative flex h-28 items-end justify-between bg-gradient-to-br ${tint(i.destination)} p-4`} aria-hidden="true">
                    <ModeIcon className="h-7 w-7 text-teal-800 transition duration-500 group-hover:translate-x-2" />
                    <span className="rotate-6 rounded-md border-2 border-dashed border-teal-800/50 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-widest text-teal-900 transition group-hover:rotate-0">
                      {i.days} {i.days === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="pr-10 font-display text-lg font-semibold leading-snug">
                      <Link to={`/itinerary/${it.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-2xl">{it.title}</Link>
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700"><MapPin className="h-4 w-4" aria-hidden="true" />{i.destination}</p>
                    <p className="mt-1 text-xs text-slate-700">By {it.author?.name || it.author?.email || "Wanderly user"}{!it.isOwner && <span className="ml-2 rounded-full bg-sky-50 px-2 py-1 font-semibold text-sky-900">Shared with you</span>}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      <li className="chip"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmt(i.startDate)}</li>
                      <li className="chip"><ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />{i.mode}</li>
                      {i.food && <li className="chip"><Utensils className="h-3.5 w-3.5" aria-hidden="true" />{i.food}</li>}
                      {i.tripType && <li className="chip">{i.tripType}</li>}
                    </ul>
                  </div>
                  {it.isOwner && <button type="button" onClick={() => remove(it)} aria-label={`Delete ${it.title}`} className="btn-icon absolute right-3 top-3 z-10 bg-white/80">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>}
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
