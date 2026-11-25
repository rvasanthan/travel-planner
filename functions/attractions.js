const MAX_SELECTED = 20;

function parseSelectedPlaces(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SELECTED
      || value.some((name) => typeof name !== "string" || !name.trim() || name.trim().length > 120 || /[\r\n]/.test(name))) {
    throw new Error("Select between 1 and 20 valid attractions.");
  }
  return [...new Set(value.map((name) => name.trim()))];
}

function validateSuggestions(value) {
  if (!value || !Array.isArray(value.places) || value.places.length < 1 || value.places.length > 20
      || value.places.some((place) => !place || typeof place.name !== "string" || !place.name.trim() || place.name.length > 120
        || typeof place.type !== "string" || place.type.length > 80
        || typeof place.description !== "string" || place.description.length > 200
        || (place.restriction != null && (typeof place.restriction !== "string" || place.restriction.length > 200)))) {
    throw new Error("Invalid attraction suggestions.");
  }
  const seen = new Set();
  return value.places.filter((place) => {
    const key = place.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((place) => ({ name: place.name.trim(), type: place.type.trim(), description: place.description.trim(), restriction: (place.restriction || "").trim() }));
}

function buildSuggestionPrompt(trip) {
  const highlights = /new\s*york|nyc|manhattan/i.test(trip.dest)
    ? " For New York City include One World Observatory, Edge at Hudson Yards, SUMMIT One Vanderbilt and Times Square."
    : "";
  return `Suggest attractions for a trip from ${trip.origin} to ${trip.dest}; trip style=${trip.type || "any"}; days=${trip.days}; kids=${trip.kids}; elders=${trip.elders}; ages=${trip.ages || "unknown"}. Return only JSON: {"places":[{"name":"","type":"","description":"","restriction":""}]}. Give 8-16 real, distinct attractions in or reasonably near the destination; prioritize iconic sights and match the trip style. Treat the origin as the journey starting point, not an attraction location.${highlights} Adventure: consider theme parks, ski resorts, outdoor adventures, zip lines and scenic train rides when available. Sightseeing: include iconic viewpoints and appropriate mountain trails; near beaches/lakes consider relevant wildlife watching, coastal drives and boardwalks. Do not list restaurants. In restriction, flag relevant possible age, height, mobility or safety restrictions requiring verification; use empty string when none are known. Do not claim accessibility or invent details. Keep descriptions and restrictions under 20 words.`;
}

function selectedPlacesInstruction(places) {
  if (!places.length) return "";
  return ` The traveler selected these attractions: ${JSON.stringify(places)}. Recommend and schedule only these selected attractions; choose nearby activities only when directly associated with them. Consider opening hours, travel time, meals and rest breaks. Fit as many as feasible without overcrowding; if any cannot fit, name them in tips and suggest the traveler unselect them or extend the trip. Choose restaurants independently based on food preferences.`;
}

module.exports = { MAX_SELECTED, parseSelectedPlaces, validateSuggestions, buildSuggestionPrompt, selectedPlacesInstruction };