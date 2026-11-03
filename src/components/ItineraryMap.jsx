import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Car, ExternalLink, Loader2, MapPin, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const SEARCH_URL = "https://photon.komoot.io/api/";
const ROUTE_URL = "https://router.project-osrm.org/route/v1/driving/";
const MAP_URL = "https://www.openstreetmap.org/?mlat=";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const keyOf = (name) => name.trim().toLocaleLowerCase();

function collectLocations(plan) {
  const locations = [];
  const byName = new Map();

  const add = (entry) => {
    if (!entry.name?.trim()) return null;
    const key = keyOf(entry.name);
    const existing = byName.get(key);
    if (existing) {
      Object.assign(existing, {
        kind: entry.kind === "Place" ? "Place" : existing.kind,
        type: entry.kind === "Place" ? entry.type : existing.type || entry.type,
        detail: entry.kind === "Place" ? entry.detail || existing.detail : existing.detail || entry.detail,
        tags: [...new Set([...(existing.tags || []), ...(entry.tags || [])])],
      });
      return existing;
    }
    const location = { ...entry, name: entry.name.trim(), id: `${entry.kind}-${locations.length}` };
    byName.set(key, location);
    locations.push(location);
    return location;
  };

  (plan.days || []).forEach((day) => (day.items || []).forEach((item) => {
    if (!item.place?.trim()) return;
    const location = add({ name: item.place, kind: "Activity", type: item.title, detail: item.note, tags: [] });
    const visit = `Day ${day.day}${day.date ? ` · ${day.date}` : ""}${item.time ? ` · ${item.time}` : ""}: ${item.title}`;
    location.visits = [...(location.visits || []), visit];
  }));

  (plan.places || []).forEach((place) => add({
    name: place.name,
    kind: "Place",
    type: place.type,
    detail: [place.why, place.tip && `Tip: ${place.tip}`].filter(Boolean).join(" · "),
    tags: [place.kids && "Kid-friendly", place.elders && "Easy access"].filter(Boolean),
  }));

  (plan.restaurants || []).forEach((restaurant) => add({
    name: restaurant.name,
    kind: "Restaurant",
    type: restaurant.cuisine,
    detail: [restaurant.area, restaurant.price, restaurant.signatureDishes?.length && `Signature dishes: ${restaurant.signatureDishes.join(", ")}`, restaurant.note].filter(Boolean).join(" · "),
    tags: [],
  }));

  return locations.slice(0, 30);
}

function FitLocations({ locations, selected, fitToAll }) {
  const map = useMap();
  useEffect(() => {
    if (!fitToAll || !locations.length) return;
    const points = locations.map((l) => [l.lat, l.lon]);
    if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(points, { padding: [36, 36], maxZoom: 12 });
  }, [fitToAll, locations, map]);

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lon], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [selected, map]);

  return null;
}

function Marker({ location, selected, onSelect }) {
  const active = selected?.id === location.id;
  return (
    <CircleMarker
      center={[location.lat, location.lon]}
      radius={active ? 11 : 8}
      pathOptions={{ color: "#ffffff", weight: 3, fillColor: location.kind === "Restaurant" ? "#b45309" : "#0f766e", fillOpacity: 1 }}
      eventHandlers={{ click: () => onSelect(location) }}
    >
      <Popup>
        <div className="min-w-44 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase text-teal-800">{location.kind}{location.type ? ` · ${location.type}` : ""}</span>
          <h3 className="text-sm font-bold text-slate-900">{location.name}</h3>
          {location.detail && <p className="text-xs text-slate-700">{location.detail}</p>}
          {location.visits?.map((visit) => <p key={visit} className="text-xs text-slate-700">{visit}</p>)}
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function ItineraryMap({ plan, destination = "" }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [fitToAll, setFitToAll] = useState(false);
  const [error, setError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [route, setRoute] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const targets = useMemo(() => collectLocations(plan), [plan]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const locate = async () => {
      setLoading(true);
      setRouteLoading(false);
      setFitToAll(false);
      setError("");
      setRouteError("");
      setRoute(null);
      setResults([]);
      setSelectedId(null);
      const located = [];

      for (const [index, target] of targets.entries()) {
        if (cancelled) return;
        if (index > 0) await wait(250);
        try {
          const q = [target.name, destination].filter(Boolean).join(", ");
          const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&limit=1&lang=en`;
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) continue;
          const data = await response.json();
          const feature = data.features?.[0];
          const coords = feature?.geometry?.coordinates;
          if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) continue;
          located.push({ ...target, lon: coords[0], lat: coords[1], address: [feature.properties?.city, feature.properties?.state, feature.properties?.country].filter(Boolean).join(", ") });
          if (!cancelled) setResults([...located]);
        } catch (e) {
          if (e.name === "AbortError") return;
        }
      }

      if (!cancelled && located.length === 0) setError("We couldn't locate these itinerary stops. You can still open their details from the list below.");
      if (!cancelled) { setFitToAll(true); setLoading(false); }

      if (cancelled || located.length < 2) return;
      setRouteLoading(true);
      try {
        const coordinates = located.map(({ lon, lat }) => `${lon},${lat}`).join(";");
        const response = await fetch(`${ROUTE_URL}${coordinates}?overview=full&geometries=geojson&steps=false`, { signal: controller.signal });
        if (!response.ok) throw new Error("Route service unavailable");
        const data = await response.json();
        const road = data.code === "Ok" ? data.routes?.[0] : null;
        if (!road?.geometry?.coordinates?.length) throw new Error("No driving route between all stops");
        if (!cancelled) setRoute({
          positions: road.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
          distanceKm: road.distance / 1000,
          durationMinutes: Math.round(road.duration / 60),
        });
      } catch (e) {
        if (e.name !== "AbortError" && !cancelled) setRouteError("A road route isn't available for every stop. Markers and map details are still available.");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };
    locate();
    return () => { cancelled = true; controller.abort(); };
  }, [targets, destination]);

  const selected = results.find((location) => location.id === selectedId) || null;
  const center = results.length ? [results[0].lat, results[0].lon] : [20, 0];

  return (
    <section aria-labelledby="map-title" className="card overflow-hidden motion-safe:animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <div>
          <p className="eyebrow flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />Explore your route</p>
          <h2 id="map-title" className="mt-1 font-display text-2xl font-semibold">Itinerary map</h2>
          <p className="mt-1 text-sm text-slate-700">Select a marker to see its itinerary details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {loading && <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-700"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />Locating {results.length} of {targets.length} places</span>}
          {!loading && routeLoading && <span role="status" className="inline-flex items-center gap-2 text-sm text-slate-700"><Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />Finding roads</span>}
          {route && <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-900"><Car className="h-4 w-4" aria-hidden="true" />{route.distanceKm.toFixed(1)} km · {route.durationMinutes < 60 ? `${route.durationMinutes} min` : `${Math.floor(route.durationMinutes / 60)} hr ${route.durationMinutes % 60} min`}</span>}
        </div>
      </div>

      <div className="relative z-0 h-[340px] w-full border-y border-slate-200 sm:h-[440px]">
        <MapContainer center={center} zoom={results.length ? 6 : 2} scrollWheelZoom={false} className="h-full w-full" aria-label="Map of itinerary destinations">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitLocations locations={results} selected={selected} fitToAll={fitToAll} />
          {route && <Polyline positions={route.positions} pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.95 }} />}
          {route && <Polyline positions={route.positions} pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.95 }} />}
          {results.map((location) => (
            <Marker key={location.id} location={location} selected={selected} onSelect={(next) => setSelectedId(next.id)} />
          ))}
        </MapContainer>
      </div>

      {error && <p role="status" className="px-5 pt-4 text-sm text-amber-900 sm:px-6">{error}</p>}
      {routeError && <p role="status" className="px-5 pt-4 text-sm text-amber-900 sm:px-6">{routeError}</p>}

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Mapped stops ({results.length})</h3>
          {targets.length === 0 ? (
            <p className="text-sm text-slate-700">No named stops were included in this itinerary.</p>
          ) : (
            <ul className="flex max-h-52 flex-wrap content-start gap-2 overflow-y-auto" aria-label="Itinerary map locations">
              {targets.map((target) => {
                const located = results.find((result) => result.id === target.id);
                return (
                  <li key={target.id}>
                    <button type="button" disabled={!located} aria-pressed={selectedId === target.id}
                      onClick={() => located && setSelectedId(target.id)}
                      className={`min-h-10 rounded-full border px-3 text-left text-sm transition disabled:opacity-60 ${selectedId === target.id ? "border-teal-800 bg-teal-800 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-teal-700 hover:bg-teal-50"}`}>
                      {target.kind === "Restaurant" ? "Restaurant · " : ""}{target.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-600">Map data © OpenStreetMap contributors. Place coordinates via OpenStreetMap search.</p>
        </div>

        <aside aria-live="polite" aria-label="Selected map location" className="min-h-32 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="eyebrow">{selected.kind}{selected.type ? ` · ${selected.type}` : ""}</p>
                  <h3 className="mt-1 font-semibold text-slate-900">{selected.name}</h3>
                </div>
                <button type="button" className="btn-icon !h-9 !w-9" aria-label="Close location details" onClick={() => setSelectedId(null)}><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
              {selected.address && <p className="mt-1 text-sm text-slate-700">{selected.address}</p>}
              {selected.detail && <p className="mt-2 text-sm text-slate-700">{selected.detail}</p>}
              {selected.tags?.length > 0 && <p className="mt-2 text-xs font-medium text-teal-900">{selected.tags.join(" · ")}</p>}
              {selected.visits?.map((visit) => <p key={visit} className="mt-2 text-xs text-slate-700">{visit}</p>)}
              <a className="link mt-3 inline-flex items-center gap-1 text-sm" href={`${MAP_URL}${selected.lat}&mlon=${selected.lon}#map=16/${selected.lat}/${selected.lon}`} target="_blank" rel="noopener noreferrer">
                Open in OpenStreetMap <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
              </a>
            </>
          ) : (
            <div className="flex min-h-24 items-center justify-center text-center text-sm text-slate-600">Choose a marker or a mapped stop to view its details.</div>
          )}
        </aside>
      </div>
    </section>
  );
}
