const { test } = require("node:test");
const assert = require("node:assert/strict");
const { returnJourneyInstruction, validReturnJourney } = require("./return-journey");

test("return instructions include both endpoints and the selected dates", () => {
  const prompt = returnJourneyInstruction("Atlanta", "Tampa");
  assert.match(prompt, /round trip from Atlanta to Tampa and back to Atlanta/);
  assert.match(prompt, /selected dates include both outbound and return/);
  assert.match(prompt, /not_feasible/);
  assert.match(prompt, /travelLeg/);
});

test("planned returns require a marked travel item; infeasible trips require an explanation", () => {
  const plan = { returnJourney: { status: "planned", summary: "Return to Atlanta" }, days: [{ items: [{ title: "Drive home", note: "Tampa to Atlanta", travelLeg: "return" }] }] };
  assert.ok(validReturnJourney(plan));
  assert.ok(!validReturnJourney({ ...plan, days: [{ items: [] }] }));
  assert.ok(validReturnJourney({ ...plan, returnJourney: { status: "not_feasible", summary: "Add another day" }, days: [{ items: [] }] }));
  assert.ok(!validReturnJourney({ ...plan, returnJourney: { status: "not_feasible", summary: "" } }));
  assert.ok(!validReturnJourney({ ...plan, days: [{ items: [{ title: "Drive", note: "Home", travelLeg: "outbound" }] }] }));
});