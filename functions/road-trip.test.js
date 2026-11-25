const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseVehicle, roadTripInstruction, validRoadTrip } = require("./road-trip");

test("vehicle details are scoped to driving and bounded", () => {
  assert.equal(parseVehicle({ mode: "Flight", vehicleType: "Electric vehicle" }), null);
  assert.deepEqual(parseVehicle({ mode: "Drive" }), { type: "Car", model: "", connector: "", range: "", size: "", departureTime: "" });
  const vehicle = parseVehicle({ mode: "Drive", vehicleType: "Electric vehicle", vehicleModel: " Model 3 ", chargingConnector: "NACS", vehicleRange: "250 miles" });
  assert.equal(vehicle.model, "Model 3");
  assert.equal(vehicle.connector, "NACS");
  assert.equal(vehicle.range, "250 miles");
  assert.equal(parseVehicle({ mode: "Drive", vehicleType: "Electric RV / camper van", chargingConnector: "CCS", vehicleSize: "24 feet", departureTime: "08:30" }).size, "24 feet");
  assert.throws(() => parseVehicle({ mode: "Drive", vehicleType: "Bicycle" }));
});

test("driving instructions cover stops, vehicles and uncertainty", () => {
  const prompt = roadTripInstruction(parseVehicle({ mode: "Drive", vehicleType: "RV / camper van" }));
  for (const phrase of ["under 7 hours", "over 7 hours", "Breakfast|Lunch|Dinner", "charging", "RV parks", "regional foods", "unverified"]) assert.ok(prompt.includes(phrase), phrase);
  assert.equal(roadTripInstruction(null), "");
});

test("road trip output checks its structure and limits", () => {
  const plan = { driveEstimate: "About 8 hours", stops: [{ type: "Rest", name: "Rest area", area: "Virginia", note: "Check hours" }], regionalFoods: [{ name: "Peanuts", area: "Virginia", note: "Local specialty" }] };
  assert.ok(validRoadTrip(plan));
  assert.ok(!validRoadTrip({ ...plan, stops: [{ ...plan.stops[0], type: "Other" }] }));
  assert.ok(!validRoadTrip({ ...plan, stops: Array(17).fill(plan.stops[0]) }));
  assert.ok(!validRoadTrip({ ...plan, regionalFoods: null }));
});