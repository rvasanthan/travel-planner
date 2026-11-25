const VEHICLE_TYPES = ["Car", "Electric vehicle", "RV / camper van", "Electric RV / camper van"];
const STOP_TYPES = ["Rest", "Charging", "Sightseeing", "Breakfast", "Lunch", "Dinner", "RV service", "RV park"];

function parseVehicle(data) {
  if (data.mode !== "Drive") return null;
  const type = data.vehicleType || "Car";
  if (!VEHICLE_TYPES.includes(type)) throw new Error("Choose a valid vehicle type.");
  const text = (value, max) => typeof value === "string" ? value.trim().replace(/[\r\n]+/g, " ").slice(0, max) : "";
  return {
    type,
    model: text(data.vehicleModel, 100),
    connector: type.startsWith("Electric") ? text(data.chargingConnector, 80) : "",
    range: type.startsWith("Electric") ? text(data.vehicleRange, 60) : "",
    size: type.includes("camper") ? text(data.vehicleSize, 80) : "",
    departureTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(data.departureTime || "") ? data.departureTime : "",
  };
}

function roadTripInstruction(vehicle) {
  if (!vehicle) return "";
  return `Driving vehicle: ${JSON.stringify(vehicle)}. Add roadTrip to the JSON: {"driveEstimate":"","stops":[{"type":"Rest|Charging|Sightseeing|Breakfast|Lunch|Dinner|RV service|RV park","name":"","area":"","note":""}],"regionalFoods":[{"name":"","area":"","note":""}]}. Estimate driving time for outbound and return legs separately and label estimates; do not claim a verified route. Suggest named quick rest stops even for drives under 7 hours; for over 7 hours include substantial breaks and, when needed, an overnight stop. Suggest notable scenic or iconic sights along the likely route, and breakfast, lunch and dinner stops appropriate to travel timing and food preferences. Include regional foods associated with areas along the route. For electric vehicles suggest charging stops suited to the model, connector and range when provided, with conservative range margins; never claim compatibility, working chargers or availability is confirmed. For RVs and camper vans suggest appropriate service locations and scenic overnight RV parks when an overnight stop is needed; do not claim amenities or vehicle size suitability are confirmed. Include stops for both legs where appropriate, ordered by journey, and identify outbound or return in each note; include a town or region in area. Only name real places you can reasonably identify, and do not invent facilities, opening hours or availability. If uncertain, say what needs checking instead of guessing. Include no more than 16 stops and 6 regional foods. Recommendations are unverified and travelers must check the actual route, hours and relevant vehicle compatibility before traveling.`;
}

function validRoadTrip(roadTrip) {
  const text = (value, max) => typeof value === "string" && value.length <= max;
  return roadTrip && typeof roadTrip === "object" && !Array.isArray(roadTrip)
    && text(roadTrip.driveEstimate, 300)
    && Array.isArray(roadTrip.stops) && roadTrip.stops.length <= 16
    && roadTrip.stops.every((stop) => stop && STOP_TYPES.includes(stop.type)
      && text(stop.name, 120) && stop.name.trim() && text(stop.area, 120) && stop.area.trim() && text(stop.note, 300))
    && Array.isArray(roadTrip.regionalFoods) && roadTrip.regionalFoods.length <= 6
    && roadTrip.regionalFoods.every((food) => food && text(food.name, 120) && food.name.trim()
      && text(food.area, 120) && food.area.trim() && text(food.note, 300));
}

module.exports = { parseVehicle, roadTripInstruction, validRoadTrip };