import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accessibility, ArrowLeft, ArrowRight, Baby, Car, Check, FileDown, Landmark, Heart, Loader2, Mountain, Palmtree,
  Plane, Printer, Save, Sparkles, Train, Trees, Users, Utensils,
} from "lucide-react";
import { auth, generateItinerary } from "../firebase";
import { createItinerary } from "../store";
import ItineraryDisplay from "../components/ItineraryDisplay";
import DestinationInput from "../components/DestinationInput";

const TRIP_TYPES = [
  ["Relaxing vacation", Palmtree], ["Adventure", Mountain], ["Cultural / Sightseeing", Landmark], ["Family fun", Users],
  ["Romantic", Heart], ["Nature / Hiking", Trees], ["Foodie", Utensils], ["Road Trip", Car], ["Kids Fun", Baby],
];
const FOODS = ["Indian", "Asian", "Thai", "Mexican", "Italian", "Mediterranean", "Vegetarian", "Local cuisine"];
const SPOTS = ["Paris", "Tokyo", "Bali", "Goa", "New York", "Rome", "Dubai", "Swiss Alps"];
const MODES = [["Flight", Plane], ["Drive", Car], ["Train", Train]];
const LENGTHS = [["Weekend", 3], ["5 days", 5], ["1 week", 7], ["2 weeks", 14]];
const STEPS = ["Destination", "Dates", "Travelers", "Tastes"];
const MESSAGES = ["Charting your route...", "Finding hidden gems...", "Checking the weather...", "Booking the best tables...", "Packing your itinerary..."];

const addDays = (s, n) => new Date(new Date(s + "T00:00:00").getTime() + n * 864e5).toISOString().slice(0, 10);
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

function Choice({ type, name, checked, onChange, label, Icon }) {
  return (
    <label className="relative block cursor-pointer">
      <input type={type} name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 bg-white py-2 pl-4 pr-10 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-teal-50/50 peer-checked:border-teal-700 peer-checked:bg-teal-50 peer-checked:text-teal-950 peer-checked:ring-1 peer-checked:ring-teal-700 peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700">
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}{label}
      </span>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 scale-50 text-teal-800 opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100" aria-hidden="true">
        <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

function QuickPick({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`min-h-9 rounded-full border px-3.5 text-sm font-medium transition hover:-translate-y-0.5 ${active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-500 bg-white text-slate-800 hover:bg-teal-50"}`}>
      {label}
    </button>
  );
}

function Stepper({ step }) {
  return (
    <ol className="flex items-center" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 items-center last:flex-none" aria-current={i === step ? "step" : undefined}>
          <span className="flex items-center gap-2">
            <span className={`grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${i < step ? "border-teal-700 bg-teal-700 text-white" : i === step ? "border-teal-700 bg-white text-teal-900 ring-4 ring-teal-100" : "border-slate-400 bg-white text-slate-700"}`}>
              {i < step ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:inline ${i === step ? "font-semibold text-slate-900" : "text-slate-700"}`}>
              {s}<span className="sr-only">{i < step ? " (completed)" : i === step ? " (current step)" : ""}</span>
            </span>
          </span>
          {i < STEPS.length - 1 && <span className={`mx-3 h-0.5 flex-1 rounded transition-colors duration-500 ${i < step ? "bg-teal-700" : "bg-slate-300"}`} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Loader({ msg }) {
  return (
    <div className="card no-print mx-auto max-w-3xl overflow-hidden motion-safe:animate-fade-up">
      <div className="relative h-32 bg-gradient-to-b from-sky-100 to-teal-50" aria-hidden="true">
        <span className="absolute left-[8%] right-[8%] top-1/2 border-t-2 border-dashed border-teal-700/40" />
        <span className="absolute top-0 h-full w-12 motion-safe:animate-fly"><Plane className="absolute top-1/2 h-9 w-9 -translate-y-1/2 rotate-45 text-teal-700" /></span>
        <span className="absolute bottom-0 h-8 w-full bg-teal-100/70" style={{ clipPath: "polygon(0 100%,0 60%,12% 20%,25% 70%,40% 10%,55% 65%,70% 25%,85% 70%,100% 30%,100% 100%)" }} />
      </div>
      <p className="p-6 text-center font-display text-xl font-semibold text-slate-900" aria-hidden="true">{msg}</p>
    </div>
  );
}

export default function Planner() {
  const nav = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    destination: "", mode: "Flight", kids: false, elders: false, ages: "", tripTypes: [TRIP_TYPES[0][0]], foods: [], foodOther: "",
    startDate: addDays(today, 30), endDate: addDays(today, 34),
  });
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [used, setUsed] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msgI, setMsgI] = useState(0);
  const [error, setError] = useState("");
  const result = useRef(null);
  const heading = useRef(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }));

  useEffect(() => { document.title = "Plan a trip - Wanderly"; }, []);
  useEffect(() => { if (plan) result.current?.focus(); }, [plan]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setMsgI((i) => (i + 1) % MESSAGES.length), 2400);
    return () => clearInterval(t);
  }, [busy]);

  const days = Math.round((new Date(f.endDate) - new Date(f.startDate)) / 864e5) + 1;

  const go = (n) => { setError(""); setStep(n); setTimeout(() => heading.current?.focus(), 0); };

  const run = async (startDate = f.startDate) => {
    setError(""); setBusy(true); setDismissed(false); setMsgI(0);
    const { tripTypes, foods, foodOther, ...rest } = f;
    const inputs = {
      ...rest, startDate, endDate: addDays(startDate, days - 1), days,
      tripType: tripTypes.join(", "), food: [...foods, foodOther.trim()].filter(Boolean).join(", "),
    };
    try {
      setPlan(await generateItinerary(inputs));
      setUsed(inputs);
    } catch (e) {
      setError(e.message || "Could not generate the itinerary. Please try again.");
    } finally { setBusy(false); }
  };

  const submit = (e) => {
    e.preventDefault();
    if (step === 1 && !(days >= 1 && days <= 14)) return setError("Your trip must be between 1 and 14 days. Please adjust the dates.");
    if (step < STEPS.length - 1) return go(step + 1);
    run();
  };

  const save = async () => {
    setBusy(true);
    try { nav(`/itinerary/${await createItinerary(used, plan)}`); }
    catch (e) { setError(e.message); setBusy(false); }
  };

  const last = step === STEPS.length - 1;

  return (
    <div className="space-y-10">
      <section className="no-print mx-auto max-w-3xl motion-safe:animate-fade-up">
        <p className="eyebrow flex items-center gap-2"><Plane className="h-4 w-4" aria-hidden="true" />New trip</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight">Let's plan your getaway</h1>

        <form onSubmit={submit} className="card mt-6 space-y-7 p-6 sm:p-8" aria-busy={busy}>
          <Stepper step={step} />
          <p className="text-sm text-slate-700">Step {step + 1} of {STEPS.length}. Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.</p>

          <div key={step} className="space-y-6 motion-safe:animate-fade-up">
            {step === 0 && (
              <>
                <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">Where are you headed?</h2>
                <div>
                  <label htmlFor="dest" className="label">Destination <span aria-hidden="true">*</span></label>
                  <DestinationInput id="dest" required value={f.destination} onChange={(v) => set("destination", v)} />
                  <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Popular destinations">
                    {SPOTS.map((s) => <QuickPick key={s} label={s} active={f.destination === s} onClick={() => set("destination", s)} />)}
                  </div>
                </div>
                <fieldset>
                  <legend className="label">How are you traveling?</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {MODES.map(([m, Icon]) => <Choice key={m} type="radio" name="mode" label={m} Icon={Icon} checked={f.mode === m} onChange={() => set("mode", m)} />)}
                  </div>
                </fieldset>
              </>
            )}

            {step === 1 && (
              <>
                <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">When are you going?</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="start" className="label">Start date <span aria-hidden="true">*</span></label>
                    <input id="start" type="date" required className="field" value={f.startDate} min={today}
                      onChange={(e) => { set("startDate", e.target.value); if (f.endDate < e.target.value) set("endDate", e.target.value); }} />
                  </div>
                  <div>
                    <label htmlFor="end" className="label">End date <span aria-hidden="true">*</span></label>
                    <input id="end" type="date" required className="field" value={f.endDate} min={f.startDate} onChange={(e) => set("endDate", e.target.value)} />
                  </div>
                </div>
                <div role="group" aria-label="Trip length shortcuts" className="flex flex-wrap gap-2">
                  {LENGTHS.map(([l, n]) => <QuickPick key={l} label={l} active={days === n} onClick={() => set("endDate", addDays(f.startDate, n - 1))} />)}
                </div>
                <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-950">
                  {days > 0 ? `${fmt(f.startDate)} to ${fmt(f.endDate)} · ${days} ${days === 1 ? "day" : "days"}` : "End date must be after the start date"}
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">Who's coming along?</h2>
                <fieldset>
                  <legend className="label">Travelers</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Choice type="checkbox" name="kids" label="Traveling with kids" Icon={Baby} checked={f.kids} onChange={(e) => set("kids", e.target.checked)} />
                    <Choice type="checkbox" name="elders" label="Traveling with elders" Icon={Accessibility} checked={f.elders} onChange={(e) => set("elders", e.target.checked)} />
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="ages" className="label">Age ranges</label>
                  <input id="ages" className="field" aria-describedby="ages-h" placeholder="e.g. 35, 33, 6, 68" value={f.ages} onChange={(e) => set("ages", e.target.value)} />
                  <p id="ages-h" className="mt-1 text-sm text-slate-700">Separate ages or ranges with commas. We'll pace the plan to suit everyone.</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">What do you love?</h2>
                <fieldset>
                  <legend className="label">Type of trip <span className="font-normal text-slate-700">(select all that apply)</span></legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {TRIP_TYPES.map(([t, Icon]) => <Choice key={t} type="checkbox" name="type" label={t} Icon={Icon} checked={f.tripTypes.includes(t)} onChange={() => toggle("tripTypes", t)} />)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="label">Food preference <span className="font-normal text-slate-700">(select all that apply)</span></legend>
                  <div className="flex flex-wrap gap-2">
                    {FOODS.map((x) => <QuickPick key={x} label={x} active={f.foods.includes(x)} onClick={() => toggle("foods", x)} />)}
                  </div>
                  <label htmlFor="food" className="label mt-4">Anything else?</label>
                  <input id="food" className="field" placeholder="e.g. Korean, Ethiopian" value={f.foodOther} onChange={(e) => set("foodOther", e.target.value)} />
                </fieldset>
              </>
            )}
          </div>

          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-900">{error}</p>}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <button type="button" className="btn-secondary" onClick={() => go(step - 1)} disabled={step === 0 || busy}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back
            </button>
            <button className="btn-primary transition hover:-translate-y-0.5 hover:shadow-lg" disabled={busy}>
              {last ? (busy ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />) : null}
              {last ? (busy ? "Planning your trip..." : "Generate itinerary") : "Next"}
              {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </section>

      <div role="status" className="sr-only">{busy ? "Generating your itinerary, please wait." : plan ? "Your itinerary is ready." : ""}</div>
      {busy && <Loader msg={MESSAGES[msgI]} />}

      {plan && !busy && (
        <section ref={result} tabIndex={-1} aria-label="Generated itinerary" className="space-y-5 outline-none">
          <div className="no-print flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={save}><Save className="h-4 w-4" aria-hidden="true" />Save itinerary</button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print</button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}><FileDown className="h-4 w-4" aria-hidden="true" />Save as PDF</button>
          </div>
          <ItineraryDisplay plan={plan} inputs={used} author={{ name: auth.currentUser?.displayName || "", email: auth.currentUser?.email || "" }} onKeepDates={dismissed ? undefined : () => setDismissed(true)} onUseAlt={(d) => run(d)} />
        </section>
      )}
    </div>
  );
}
