function returnJourneyInstruction(origin, destination) {
  return `This is a round trip from ${origin} to ${destination} and back to ${origin}. The selected dates include both outbound and return travel. Reserve enough time for a realistic return journey, including transfers, breaks, charging or overnight stops when relevant. Schedule the return across as many days as needed within the selected dates; do not assume travel can be completed in a single day. Mark each return travel item in days[].items with "travelLeg":"return" and include its departure and arrival locations and approximate duration in its title or note. Set returnJourney={"status":"planned","summary":"..."} when the entire return to ${origin} fits within the selected dates. Otherwise set returnJourney={"status":"not_feasible","summary":"..."} and explain that more time or a changed itinerary is needed; do not pretend the traveler gets home within the dates. Do not schedule destination activities after departure for home. Return estimates are unverified.`;
}

function validReturnJourney(plan) {
  const journey = plan?.returnJourney;
  if (!journey || !["planned", "not_feasible"].includes(journey.status)
      || typeof journey.summary !== "string" || !journey.summary.trim() || journey.summary.length > 500) return false;
  const items = plan.days.flatMap((day) => day.items);
  if (items.some((item) => item.travelLeg !== undefined && item.travelLeg !== "return")) return false;
  return journey.status !== "planned" || items.some((item) => item.travelLeg === "return" && item.title.trim() && item.note.trim());
}

module.exports = { returnJourneyInstruction, validReturnJourney };