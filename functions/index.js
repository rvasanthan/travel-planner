const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { parseSelectedPlaces, validateSuggestions, buildSuggestionPrompt, selectedPlacesInstruction } = require("./attractions");

initializeApp();
const adminDb = getFirestore();
const ADMIN_EMAIL = "vasanth.ravindran@gmail.com";
const ALLOWED_ORIGINS = [
  "https://travel-planner-e9fe7.web.app",
  "https://travel-planner-e9fe7.firebaseapp.com",
  "https://localhost",
  "http://localhost:5173",
];

async function assertApproved(uid, token) {
  if (token.email?.toLowerCase() === ADMIN_EMAIL && token.email_verified === true) return;
  const profile = await adminDb.collection("users").doc(uid).get();
  if (!profile.exists || profile.data().status !== "approved" || profile.data().role !== "general") {
    throw new HttpsError("permission-denied", "Your account must be approved to use this feature.");
  }
}

exports.setItineraryShare = onCall({ cors: ALLOWED_ORIGINS }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  await assertApproved(req.auth.uid, req.auth.token);
  const itineraryId = s(req.data?.itineraryId, 120);
  const email = s(req.data?.email, 254).trim().toLowerCase();
  const shouldShare = req.data?.shouldShare === true;
  if (!itineraryId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }

  const itineraryRef = adminDb.collection("itineraries").doc(itineraryId);
  const [itinerary, targetSnapshot] = await Promise.all([
    itineraryRef.get(),
    adminDb.collection("users").where("email", "==", email).limit(1).get(),
  ]);
  if (!itinerary.exists || itinerary.data().uid !== req.auth.uid) {
    throw new HttpsError("permission-denied", "Only the itinerary owner can change sharing.");
  }

  const target = targetSnapshot.docs[0];
  if (shouldShare) {
    if (!target || target.data().status !== "approved" || target.data().role !== "general") {
      throw new HttpsError("not-found", "No approved Wanderly user was found with that email.");
    }
    if (target.id === req.auth.uid) throw new HttpsError("invalid-argument", "You already own this itinerary.");
    await itineraryRef.update({
      sharedWithUids: FieldValue.arrayUnion(target.id),
      sharedWithEmails: FieldValue.arrayUnion(email),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    if (target) {
      await itineraryRef.update({
        sharedWithUids: FieldValue.arrayRemove(target.id),
        sharedWithEmails: FieldValue.arrayRemove(email),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await itineraryRef.update({ sharedWithEmails: FieldValue.arrayRemove(email), updatedAt: FieldValue.serverTimestamp() });
    }
  }
  const updated = await itineraryRef.get();
  return { sharedWithEmails: updated.data().sharedWithEmails || [] };
});

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const MODEL = "gemini-3.5-flash-lite";

const s = (v, max = 80) => typeof v === "string" ? v.trim().slice(0, max).replace(/[\r\n]+/g, " ") : "";

function validate(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    throw new HttpsError("invalid-argument", "Trip details are required.");
  }
  const destination = s(d.destination, 120);
  const passportCountry = s(d.passportCountry, 80);
  const startDate = s(d.startDate, 10);
  const start = new Date(`${startDate}T00:00:00Z`);
  const days = Number(d.days);
  if (destination.length < 2 || passportCountry.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)
      || Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== startDate
      || !Number.isInteger(days) || days < 1 || days > 14) {
    throw new HttpsError("invalid-argument", "Destination, passport country, valid start date and 1-14 days are required.");
  }
  if (!["Flight", "Drive", "Train"].includes(d.mode)) {
    throw new HttpsError("invalid-argument", "Choose Flight, Drive or Train.");
  }
  if (typeof d.kids !== "boolean" || typeof d.elders !== "boolean") {
    throw new HttpsError("invalid-argument", "Traveler selections must be boolean values.");
  }
  let selectedPlaces;
  try { selectedPlaces = parseSelectedPlaces(d.selectedPlaces); }
  catch (error) { throw new HttpsError("invalid-argument", error.message); }
  return {
    dest: destination,
    passportCountry,
    mode: d.mode,
    kids: d.kids,
    elders: d.elders,
    ages: s(d.ages, 60),
    food: s(d.food, 120),
    type: s(d.tripType, 120),
    start: start.toISOString().slice(0, 10),
    days,
    selectedPlaces,
  };
}

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, max = 300) => typeof value === "string" && value.length <= max;

function validatePlan(plan, expectedDays) {
  if (!isRecord(plan) || !isText(plan.title, 120) || !isText(plan.summary)
      || !Array.isArray(plan.days) || plan.days.length !== expectedDays
      || !Array.isArray(plan.places) || plan.places.length > 20
      || !Array.isArray(plan.restaurants) || plan.restaurants.length > 20
      || !Array.isArray(plan.tips) || plan.tips.length > 10
      || !isRecord(plan.visa) || !["visa_required", "visa_free", "visa_on_arrival", "evisa", "unknown"].includes(plan.visa.status)
      || !isText(plan.visa.summary, 500) || !isText(plan.visa.officialUrl ?? "", 500)
      || !isRecord(plan.season) || !["peak", "shoulder", "off"].includes(plan.season.level)
      || !isRecord(plan.weather)) {
    throw new HttpsError("internal", "The itinerary service returned an invalid plan. Please retry.");
  }

  const validPlaces = plan.places.every((place) => isRecord(place)
    && isText(place.name, 120) && isText(place.type, 80) && isText(place.why)
    && isText(place.tip ?? "") && typeof place.kids === "boolean" && typeof place.elders === "boolean");
  const validRestaurants = plan.restaurants.every((restaurant) => isRecord(restaurant)
    && isText(restaurant.name, 120) && isText(restaurant.cuisine, 80)
    && isText(restaurant.area, 120) && Array.isArray(restaurant.signatureDishes)
    && restaurant.signatureDishes.length <= 8 && restaurant.signatureDishes.every((dish) => isText(dish, 100)));
  const validDays = plan.days.every((day, index) => isRecord(day)
    && day.day === index + 1 && isText(day.date, 10) && isText(day.theme, 120)
    && Array.isArray(day.items) && day.items.length <= 6
    && day.items.every((item) => isRecord(item) && isText(item.time, 20)
      && isText(item.title, 120) && isText(item.place, 120) && isText(item.note)));
  let validVisaUrl = plan.visa.officialUrl === "";
  if (plan.visa.officialUrl) {
    try { validVisaUrl = new URL(plan.visa.officialUrl).protocol === "https:"; }
    catch { validVisaUrl = false; }
  }
  const visaNeedsLink = ["visa_required", "evisa", "visa_on_arrival"].includes(plan.visa.status);
  if (!validPlaces || !validRestaurants || !validDays
      || !plan.tips.every((tip) => isText(tip, 300)) || !validVisaUrl
      || (visaNeedsLink && !plan.visa.officialUrl)) {
    throw new HttpsError("internal", "The itinerary service returned invalid details. Please retry.");
  }
  return plan;
}

// Compact prompt: short keys, strict JSON schema, brevity limits to save tokens.
function buildPrompt(t) {
  const isNewYork = /new\s*york|nyc|manhattan/i.test(t.dest);
  const highlights = t.selectedPlaces.length ? "" : isNewYork
    ? " NYC places must include One World Observatory, Edge at Hudson Yards, SUMMIT One Vanderbilt, and Times Square; schedule only what fits the trip length."
    : " Include the destination's signature landmarks and most popular attractions, not only generic activities.";
  return `Travel planner. Return ONLY minified JSON, no prose.
Trip: dest=${t.dest}; passport country=${t.passportCountry}; via=${t.mode}; start=${t.start}; days=${t.days}; kids=${t.kids}; elders=${t.elders}; ages=${t.ages || "n/a"}; food=${t.food || "any"}; style=${t.type || "any"}.
Rules: exactly ${t.days} days in "days"; group nearby places per day; max 4 items/day; if kids/elders, keep pace relaxed, avoid strenuous/long walks, add rest breaks; for Road Trip include scenic stops and reasonable drive legs; for Kids Fun prioritize child-friendly activities;${highlights}${selectedPlacesInstruction(t.selectedPlaces)} Determine the destination country and give general tourist entry/visa guidance for an ordinary passport issued by the stated passport country. Set visa.status to visa_required, visa_free, visa_on_arrival, evisa, or unknown. Do not guess: if requirements or destination country cannot be confirmed, use unknown and say to verify. For visa_required, evisa, or visa_on_arrival, include officialUrl linking directly to the destination government's official visa application or immigration guidance page. For visa_free, use an official government source if known, otherwise leave officialUrl empty. Never invent URLs or use commercial visa services, blogs, or travel agencies. Laws change; say this is general guidance and travelers must confirm with the destination's official immigration authority or embassy. Adventure: consider theme parks, ski resorts, outdoor adventures, zip lining and train rides where available; if elders or young children travel, explain relevant age, mobility or safety restrictions and advise checking with operators. Sightseeing: prioritize iconic viewpoints and appropriate trails in mountains; at beaches or lakes consider available whale or dolphin watching, scenic coastal drives and boardwalks. Do not invent attractions, restrictions or availability. Each place tip is practical; list signature dishes only when confidently associated with that restaurant, else []; each text <=15 words.
Rate season for the dates (price/crowds): level is peak|shoulder|off. If peak, give 2 cheaper alt windows of same length within 12 months.
Schema:{"title":"","summary":"","visa":{"status":"visa_required|visa_free|visa_on_arrival|evisa|unknown","summary":"","officialUrl":""},"season":{"level":"","note":"","alts":[{"start":"YYYY-MM-DD","why":""}]},"weather":{"summary":"","highC":0,"lowC":0,"tips":""},"places":[{"name":"","type":"","why":"","tip":"","kids":true,"elders":true}],"days":[{"day":1,"date":"YYYY-MM-DD","theme":"","items":[{"time":"09:00","title":"","place":"","note":""}]}],"restaurants":[{"name":"","cuisine":"","area":"","price":"$|$$|$$$","signatureDishes":[""],"note":""}],"tips":[""]}
${t.selectedPlaces.length ? "List only selected attractions, even if fewer than 6." : "Give 6-10 places."} Give 5-8 restaurants and 3 tips.`;
}

exports.suggestAttractions = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "256MiB", cors: ALLOWED_ORIGINS },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertApproved(req.auth.uid, req.auth.token);
    const trip = validate(req.data || {});
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(90_000),
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildSuggestionPrompt(trip) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 4096 },
        }),
      });
      if (!response.ok) throw new Error(`Suggestion service returned ${response.status}`);
      const body = await response.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { places: validateSuggestions(JSON.parse(text)) };
    } catch (error) {
      console.error("Attraction suggestions failed", error);
      throw new HttpsError("internal", "Could not suggest attractions. Please try again.");
    }
  }
);

exports.generateItinerary = onCall(
  {
    secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "256MiB",
    cors: ALLOWED_ORIGINS,
  },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertApproved(req.auth.uid, req.auth.token);
    const trip = validate(req.data || {});
    const prompt = buildPrompt(trip);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          signal: AbortSignal.timeout(90_000),
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY.value() },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
              maxOutputTokens: 8192,
            },
          }),
        }
      );
      if (!res.ok) {
        console.error("Gemini request failed", res.status);
        throw new HttpsError("internal", "Itinerary generation is temporarily unavailable.");
      }
      const body = await res.json();
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      return { plan: validatePlan(JSON.parse(text), trip.days) };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("Gemini response failed validation or timed out", error);
      throw new HttpsError("internal", "LLM returned invalid JSON. Please retry.");
    }
  }
);
