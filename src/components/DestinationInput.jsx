import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

const API = "https://photon.komoot.io/api/";

const label = (p) =>
  [p.name, p.city !== p.name && p.city, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");

// Accessible combobox (ARIA 1.2) backed by the free Photon (OpenStreetMap) search: cities, parks and landmarks.
export default function DestinationInput({ id, value, onChange, required }) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const skip = useRef(false);

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = value.trim();
    if (q.length < 2) { setOptions([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}?q=${encodeURIComponent(q)}&limit=8&lang=en`, { signal: ctrl.signal });
        const data = await res.json();
        const seen = new Set();
        const list = (data.features || []).map((f) => label(f.properties)).filter((l) => l && !seen.has(l) && seen.add(l)).slice(0, 6);
        setOptions(list); setActive(-1); setOpen(list.length > 0);
      } catch { /* aborted or offline: free text still works */ }
      finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  const pick = (v) => { skip.current = true; onChange(v); setOpen(false); setActive(-1); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!options.length) return;
      e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault(); pick(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault(); setOpen(false);
    }
  };

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" aria-hidden="true" />
      <input
        id={id} required={required} className="field !pl-10 !pr-10" placeholder="e.g. Kyoto, Japan" autoComplete="off"
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${uid}-o${active}` : undefined}
        value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        onFocus={() => options.length && setOpen(true)} onBlur={() => setOpen(false)}
      />
      {loading && <Loader2 className="absolute right-3.5 top-3.5 h-4 w-4 text-teal-700 motion-safe:animate-spin" aria-hidden="true" />}
      <ul id={listId} role="listbox" aria-label="Destination suggestions" hidden={!open}
        className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-300 bg-white py-1 shadow-xl">
        {options.map((o, i) => (
          <li key={o} id={`${uid}-o${i}`} role="option" aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)} onMouseEnter={() => setActive(i)}
            className={`flex min-h-11 cursor-pointer items-center gap-2 px-3.5 py-2 text-sm text-slate-900 ${i === active ? "bg-teal-50 font-semibold" : ""}`}>
            <MapPin className="h-4 w-4 shrink-0 text-teal-800" aria-hidden="true" />{o}
          </li>
        ))}
      </ul>
      <p role="status" className="sr-only">{open ? `${options.length} suggestions available. Use up and down arrows to review.` : ""}</p>
    </div>
  );
}
