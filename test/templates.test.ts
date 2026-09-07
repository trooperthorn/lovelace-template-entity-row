// @vitest-environment jsdom
//
// templates.ts touches `window` at module load time (it seeds
// window.cardMod_template_cache, the shared cache other cards use too), so
// even importing it - not just calling a DOM-touching function - needs a
// `window` global. vitest's default environment is plain Node.
import { describe, expect, it } from "vitest";
import { hasTemplate } from "../src/helpers/templates";

// First test in this repo (Phase 0 - it had no test runner at all before this).
// Starts with hasTemplate() since it's pure and needs no DOM/jsdom setup; a
// later pass can add jsdom for anything that touches document/customElements
// (bind_template, bindActionHandler) once there's a reason to.

describe("hasTemplate", () => {
  it("returns false for an empty or falsy value", () => {
    expect(hasTemplate("")).toBe(false);
    expect(hasTemplate(undefined)).toBe(false);
    expect(hasTemplate(null)).toBe(false);
  });

  it("returns false for a plain string with no template markers", () => {
    expect(hasTemplate("Kitchen")).toBe(false);
  });

  it("returns true for a string containing a Jinja expression", () => {
    expect(hasTemplate("{{ area_name(entity) }}")).toBe(true);
  });

  it("returns true for a string containing a Jinja statement", () => {
    expect(hasTemplate("{% if is_state('a', 'on') %}on{% endif %}")).toBe(true);
  });

  it("coerces a non-string value to a string before checking", () => {
    // hasTemplate does String(str).includes(...) - a number/boolean shouldn't throw.
    expect(hasTemplate(42 as unknown as string)).toBe(false);
  });
});
