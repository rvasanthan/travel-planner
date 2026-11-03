import {
  Accessibility, Baby, CalendarDays, Clock, CloudSun, Equal, ExternalLink, Landmark, Lightbulb, MapPin, Plane, Plus,
  Trash2, TrendingDown, TrendingUp, Trees, Utensils,
} from "lucide-react";
import { lazy, Suspense } from "react";

const ItineraryMap = lazy(() => import("./ItineraryMap"));

const SEASON = {
  peak: { cls: "border-rose-300 bg-rose-50 text-rose-950", Icon: TrendingUp, label: "Peak season", sub: "Higher prices and bigger crowds" },
  shoulder: { cls: "border-amber-300 bg-amber-50 text-amber-950", Icon: Equal, label: "Shoulder season", sub: "Moderate prices and crowds" },
  off: { cls: "border-emerald-300 bg-emerald-50 text-emerald-950", Icon: TrendingDown, label: "Off-peak", sub: "Good value and fewer crowds" },
};

const fmt = (d, long) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, long ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" }) : "";
const endDate = (s, n) => new Date(new Date(s + "T00:00:00").getTime() + (n - 1) * 864e5).toISOString().slice(0, 10);

const mapsUrl = (name, area) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, area].filter(Boolean).join(", "))}`;

// Picks a themed icon from the free-text place type.
function placeIcon(type = "") {
  const t = type.toLowerCase();
  if (/museum|temple|histor|castle|church|palace|monument|cultur|shrine|landmark/.test(t)) return Landmark;
  if (/park|beach|nature|garden|mountain|hike|lake|forest|waterfall|island|trail/.test(t)) return Trees;
  if (/food|market|cafe|restaurant|street/.test(t)) return Utensils;
  return MapPin;
}

const stagger = (i) => ({ animationDelay: `${Math.min(i, 10) * 70}ms` });

function MapLink({ name, area, children }) {
  return (
    <a href={mapsUrl(name, area)} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
      {children || name}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens Google Maps in a new tab)</span>
    </a>
  );
}

function Section({ icon: Icon, title, id, children, className = "", delay = 0 }) {
  return (
    <section aria-labelledby={id} className={`card p-6 motion-safe:animate-fade-up ${className}`} style={stagger(delay)}>
      <h2 id={id} className="mb-4 flex items-center gap-3 font-display text-xl font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-800" aria-hidden="true"><Icon className="h-5 w-5" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, editable, className = "", multiline }) {
  if (!editable) return <span className={className}>{value}</span>;
  const Tag = multiline ? "textarea" : "input";
  return <Tag aria-label={label} rows={multiline ? 3 : undefined} className={`field ${className}`} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

function Fact({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/80 px-3.5 py-2.5 shadow-sm">
      <Icon className="h-5 w-5 text-teal-800" aria-hidden="true" />
      <p className="text-sm text-slate-700"><span className="font-display text-lg font-semibold text-slate-900">{value}</span> {label}</p>
    </div>
  );
}

export default function ItineraryDisplay({ plan, inputs = {}, author, copiedFrom, editable = false, onChange, onKeepDates, onUseAlt }) {
  const dest = inputs.destination;
  const set = (patch) => onChange({ ...plan, ...patch });
  const setDay = (di, patch) => set({ days: plan.days.map((d, i) => (i === di ? { ...d, ...patch } : d)) });
  const setItem = (di, ii, patch) =>
    setDay(di, { items: plan.days[di].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  const season = plan.season;
  const sx = SEASON[season?.level] || SEASON.shoulder;

  return (
    <article className="space-y-6">
      <header className="card relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6 sm:p-8 motion-safe:animate-fade-up">
        <svg viewBox="0 0 200 120" className="pointer-events-none absolute -right-4 -top-2 hidden h-32 w-52 sm:block" aria-hidden="true">
          <path d="M10 100C50 20 120 120 180 24" fill="none" stroke="#0f766e" strokeOpacity=".35" strokeWidth="2" strokeDasharray="5 6" />
          <circle cx="10" cy="100" r="5" fill="#0f766e" fillOpacity=".4" />
          <g className="motion-safe:animate-bob"><path d="M180 6a14 14 0 0 0-14 14c0 10 14 26 14 26s14-16 14-26A14 14 0 0 0 180 6z" fill="#f59e0b" fillOpacity=".85" /><circle cx="180" cy="20" r="5" fill="#fff" /></g>
        </svg>
        <p className="eyebrow flex items-center gap-2"><Plane className="h-4 w-4" aria-hidden="true" />Your itinerary</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:max-w-[75%] sm:text-4xl">
          <Field editable={editable} label="Itinerary title" value={plan.title} onChange={(v) => set({ title: v })} />
        </h1>
        <div className="mt-3 max-w-3xl text-base text-slate-700">
          <Field editable={editable} multiline label="Summary" value={plan.summary} onChange={(v) => set({ summary: v })} />
        </div>
        {author && <p className="mt-3 text-sm text-slate-700">Planned by <span className="font-semibold text-slate-900">{author.name || author.email || "Wanderly user"}</span></p>}
        {copiedFrom && <p className="mt-1 text-sm text-slate-700">Customized copy of {copiedFrom.author || "another user's itinerary"}</p>}
        {inputs.startDate && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {dest && <li className="chip"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{dest}</li>}
            <li className="chip"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmt(inputs.startDate)} to {fmt(endDate(inputs.startDate, inputs.days))} ({inputs.days} days)</li>
            {inputs.mode && <li className="chip">By {inputs.mode.toLowerCase()}</li>}
            {inputs.kids && <li className="chip"><Baby className="h-3.5 w-3.5" aria-hidden="true" />Kids</li>}
            {inputs.elders && <li className="chip"><Accessibility className="h-3.5 w-3.5" aria-hidden="true" />Elders</li>}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Fact icon={CalendarDays} value={plan.days?.length || 0} label="days" />
          <Fact icon={MapPin} value={plan.places?.length || 0} label="places" />
          <Fact icon={Utensils} value={plan.restaurants?.length || 0} label="restaurants" />
        </div>
      </header>

      {season && (
        <section aria-labelledby="season-h" className={`rounded-2xl border p-5 motion-safe:animate-pop ${sx.cls}`} style={stagger(1)}>
          <div className="flex items-start gap-3">
            <sx.Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 id="season-h" className="text-base font-semibold !text-inherit">{sx.label}<span className="font-normal"> - {sx.sub}</span></h2>
              <p className="mt-1 text-sm">{season.note}</p>
            </div>
          </div>
          {onKeepDates && (
            <div className="no-print mt-4 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" onClick={onKeepDates}>Keep my dates</button>
              {season.alts?.map((a) => (
                <button key={a.start} type="button" className="btn-secondary" onClick={() => onUseAlt(a.start)}>
                  Switch to {fmt(a.start)}<span className="font-normal text-slate-700">: {a.why}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <Suspense fallback={<div className="card h-72 animate-pulse bg-slate-100" role="status">Loading itinerary map...</div>}>
        <ItineraryMap plan={plan} destination={dest} />
      </Suspense>

      <Section icon={MapPin} title="Places to visit" id="places-h" delay={2}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plan.places?.map((p, i) => {
            const Icon = placeIcon(p.type);
            return (
              <li key={i} className="group relative rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-teal-300 hover:bg-white hover:shadow-md">
                <div className="flex items-start gap-3 pr-8">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-800 transition group-hover:scale-110" aria-hidden="true"><Icon className="h-4 w-4" /></span>
                  <div>
                    <p className="font-semibold text-slate-900"><MapLink name={p.name} area={dest} /></p>
                    <p className="mt-1"><span className="chip !bg-teal-50 !text-teal-900">{p.type}</span></p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700">{p.why}</p>
                {p.tip && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950"><strong>Tip:</strong> {p.tip}</p>}
                {(p.kids || p.elders) && (
                  <p className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium text-slate-700">
                    {p.kids && <span className="inline-flex items-center gap-1"><Baby className="h-3.5 w-3.5" aria-hidden="true" />Kid-friendly</span>}
                    {p.elders && <span className="inline-flex items-center gap-1"><Accessibility className="h-3.5 w-3.5" aria-hidden="true" />Easy access</span>}
                  </p>
                )}
                {editable && (
                  <button type="button" className="btn-icon no-print absolute right-1 top-1" aria-label={`Remove ${p.name}`} onClick={() => set({ places: plan.places.filter((_, k) => k !== i) })}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section icon={CalendarDays} title="Day-by-day plan" id="days-h" className="lg:col-span-2" delay={3}>
          <ol className="space-y-6">
            {plan.days?.map((d, di) => (
              <li key={di} className="overflow-hidden rounded-xl border border-slate-200 [break-inside:avoid]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-dashed border-teal-200 bg-teal-50/70 px-5 py-3">
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                    <Plane className="h-4 w-4 rotate-45 text-teal-800" aria-hidden="true" />Day {d.day}
                  </h3>
                  <span className="text-sm font-medium text-slate-700">{fmt(d.date, true)}</span>
                </div>
                <div className="p-5">
                  <div className="mb-4 text-sm font-semibold text-teal-900">
                    <Field editable={editable} label={`Day ${d.day} theme`} value={d.theme} onChange={(v) => setDay(di, { theme: v })} />
                  </div>
                  <ol className="relative space-y-4 border-l-2 border-teal-100 pl-5">
                    {d.items?.map((it, ii) => (
                      <li key={ii} className="relative">
                        <span className="absolute -left-[1.72rem] top-1.5 h-3 w-3 rounded-full border-2 border-teal-700 bg-white" aria-hidden="true" />
                        {editable ? (
                          <div className="grid gap-2 sm:grid-cols-[6rem_1fr_auto]">
                            <Field editable label={`Day ${d.day} activity ${ii + 1} time`} value={it.time} onChange={(v) => setItem(di, ii, { time: v })} />
                            <Field editable label={`Day ${d.day} activity ${ii + 1} title`} value={it.title} onChange={(v) => setItem(di, ii, { title: v })} />
                            <button type="button" className="btn-icon no-print" aria-label={`Remove activity ${it.title}`} onClick={() => setDay(di, { items: d.items.filter((_, k) => k !== ii) })}>
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <Field editable label={`Day ${d.day} activity ${ii + 1} note`} value={it.note} onChange={(v) => setItem(di, ii, { note: v })} className="sm:col-span-3" />
                          </div>
                        ) : (
                          <>
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              {it.time && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900"><Clock className="h-3 w-3" aria-hidden="true" />{it.time}</span>}
                              <span className="font-semibold text-slate-900">{it.title}</span>
                            </p>
                            {it.place && <p className="mt-0.5 text-sm"><MapLink name={it.place} area={dest} /></p>}
                            {it.note && <p className="mt-0.5 text-sm text-slate-700">{it.note}</p>}
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                  {editable && (
                    <button type="button" className="btn-secondary no-print mt-4" onClick={() => setDay(di, { items: [...(d.items || []), { time: "", title: "New activity", place: "", note: "" }] })}>
                      <Plus className="h-4 w-4" aria-hidden="true" />Add activity to day {d.day}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <div className="space-y-6">
          {plan.weather && (
            <Section icon={CloudSun} title="Weather" id="weather-h" delay={4}>
              <p className="text-sm text-slate-700">{plan.weather.summary}</p>
              <p className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-950">High {plan.weather.highC}°C · Low {plan.weather.lowC}°C</p>
              <p className="mt-2 text-sm text-slate-700">{plan.weather.tips}</p>
            </Section>
          )}
          <Section icon={Utensils} title="Where to eat" id="eat-h" delay={5}>
            <ul className="space-y-4">
              {plan.restaurants?.map((r, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900"><MapLink name={r.name} area={r.area || dest} /> <span className="text-xs font-medium text-slate-700">{r.price}</span></p>
                    <p className="text-sm text-slate-700">{r.cuisine} · {r.area}</p>
                    {r.signatureDishes?.length > 0 && <p className="text-sm text-slate-700"><span className="font-semibold">Signature dishes:</span> {r.signatureDishes.join(", ")}</p>}
                    {r.note && <p className="text-sm text-slate-700">{r.note}</p>}
                  </div>
                  {editable && (
                    <button type="button" className="btn-icon no-print -mt-2" aria-label={`Remove ${r.name}`} onClick={() => set({ restaurants: plan.restaurants.filter((_, k) => k !== i) })}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
          <Section icon={Lightbulb} title="Good to know" id="tips-h" delay={6}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700 marker:text-teal-700">
              {plan.tips?.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </Section>
        </div>
      </div>
    </article>
  );
}
