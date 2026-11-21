const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseSelectedPlaces, validateSuggestions, buildSuggestionPrompt, selectedPlacesInstruction } = require("./attractions");

test("selected attractions are trimmed, deduplicated and bounded", () => {
  assert.deepEqual(parseSelectedPlaces([" Edge ", "Edge", "Times Square"]), ["Edge", "Times Square"]);
  assert.deepEqual(parseSelectedPlaces(undefined), []);
  assert.throws(() => parseSelectedPlaces([]));
  assert.throws(() => parseSelectedPlaces(["invalid\nname"]));
  assert.throws(() => parseSelectedPlaces(Array(21).fill("Place")));
});

test("suggestions validate and remove duplicates", () => {
  assert.deepEqual(validateSuggestions({ places: [{ name: "Edge", type: "Viewpoint", description: "City views", restriction: " Check height rules " }, { name: "edge", type: "Viewpoint", description: "Duplicate" }] }), [{ name: "Edge", type: "Viewpoint", description: "City views", restriction: "Check height rules" }]);
  assert.equal(validateSuggestions({ places: [{ name: "Edge", type: "Viewpoint", description: "City views" }] })[0].restriction, "");
  assert.throws(() => validateSuggestions({ places: [] }));
  assert.throws(() => validateSuggestions({ places: [{ name: "X" }] }));
  assert.throws(() => validateSuggestions({ places: [{ name: "Edge", type: "Viewpoint", description: "Views", restriction: 42 }] }));
});

test("prompts preserve attraction choices and include requested activity guidance", () => {
  const prompt = buildSuggestionPrompt({ dest: "New York", type: "Adventure", days: 3, kids: true, elders: false });
  assert.match(prompt, /theme parks/);
  assert.match(prompt, /boardwalks/);
  assert.match(prompt, /SUMMIT One Vanderbilt/);
  assert.match(prompt, /Do not list restaurants/);
  assert.match(prompt, /restriction/);
  assert.match(selectedPlacesInstruction(["Edge"]), /"Edge"/);
  assert.match(selectedPlacesInstruction(["Edge"]), /restaurants independently/);
  assert.match(selectedPlacesInstruction(["Edge"]), /unselect/);
});