const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

initializeApp();
const adminDb = getFirestore();
const ADMIN_EMAIL = "vasanth.ravindran@gmail.com";

async function assertApproved(uid, token) {
  if (token.email?.toLowerCase() === ADMIN_EMAIL && token.email_verified === true) return;
  const profile = await adminDb.collection("users").doc(uid).get();
  if (!profile.exists || profile.data().status !== "approved" || profile.data().role !== "general") {
    throw new HttpsError("permission-denied", "Your account must be approved to use this feature.");
  }
}

exports.setItineraryShare = onCall(async (req) => {
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

const s = (v, max = 80) => String(v ?? "").slice(0, max).replace(/[\r\n]+/g, " ");

function validate(d) {
  const start = new Date(d.startDate);
  const days = Number(d.days);
  if (!s(d.destination) || isNaN(start) || !(days >= 1 && days <= 14)) {
    throw new HttpsError("invalid-argument", "Destination, valid start date and 1-14 days are required.");
  }
  return {
    dest: s(d.destination),
    mode: ["Flight", "Drive", "Train"].includes(d.mode) ? d.mode : "Flight",
    kids: !!d.kids,
    elders: !!d.elders,
    ages: s(d.ages, 60),
    food: s(d.food, 120),
    type: s(d.tripType, 120),
    start: start.toISOString().slice(0, 10),
    days,
  };
}

// Compact prompt: short keys, strict JSON schema, brevity limits to save tokens.
function buildPrompt(t) {
  const isNewYork = /new\s*york|nyc|manhattan/i.test(t.dest);
  const highlights = isNewYork
    ? " NYC places must include One World Observatory, Edge at Hudson Yards, SUMMIT One Vanderbilt, and Times Square; schedule only what fits the trip length."
    : " Include the destination's signature landmarks and most popular attractions, not only generic activities.";
  return `Travel planner. Return ONLY minified JSON, no prose.
Trip: dest=${t.dest}; via=${t.mode}; start=${t.start}; days=${t.days}; kids=${t.kids}; elders=${t.elders}; ages=${t.ages || "n/a"}; food=${t.food || "any"}; style=${t.type || "any"}.
Rules: exactly ${t.days} days in "days"; group nearby places per day; max 4 items/day; if kids/elders, keep pace relaxed, avoid strenuous/long walks, add rest breaks; for Road Trip include scenic stops and reasonable drive legs; for Kids Fun prioritize child-friendly activities;${highlights} each place tip is practical (tickets, timing, etiquette or access); list signature dishes only when well-known and confidently associated with that restaurant, else []; never invent specifics; each text <=15 words.
Rate season for the dates (price/crowds): level is peak|shoulder|off. If peak, give 2 cheaper alt windows of same length within 12 months.
Schema:{"title":"","summary":"","season":{"level":"","note":"","alts":[{"start":"YYYY-MM-DD","why":""}]},"weather":{"summary":"","highC":0,"lowC":0,"tips":""},"places":[{"name":"","type":"","why":"","tip":"","kids":true,"elders":true}],"days":[{"day":1,"date":"YYYY-MM-DD","theme":"","items":[{"time":"09:00","title":"","place":"","note":""}]}],"restaurants":[{"name":"","cuisine":"","area":"","price":"$|$$|$$$","signatureDishes":[""],"note":""}],"tips":[""]}
Give 6-10 places, 5-8 restaurants, 3 tips.`;
}

exports.generateItinerary = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: "256MiB", cors: true },
  async (req) => {
    if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
    await assertApproved(req.auth.uid, req.auth.token);
    const prompt = buildPrompt(validate(req.data || {}));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
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
    if (!res.ok) throw new HttpsError("internal", `LLM error ${res.status}`);
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      return { plan: JSON.parse(text) };
    } catch {
      throw new HttpsError("internal", "LLM returned invalid JSON. Please retry.");
    }
  }
);
