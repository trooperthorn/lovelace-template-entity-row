// @vitest-environment jsdom
//
// main.ts imports helpers/templates.ts at module load time, which touches
// `window` (see templates.test.ts) - same reason this needs jsdom.
import { describe, expect, it } from "vitest";
import { withEntityContext } from "../src/main";

describe("withEntityContext", () => {
  it("returns the template unchanged when there is no entity", () => {
    expect(withEntityContext("{{ 1 + 1 }}", undefined)).toBe("{{ 1 + 1 }}");
  });

  it("prefixes a Jinja preamble binding entity/area/label/device_class before the template", () => {
    const result = withEntityContext("{{ area }}", "binary_sensor.kitchen_leak");
    expect(result).toContain(`{% set entity = "binary_sensor.kitchen_leak" %}`);
    expect(result).toContain("{% set area = area_name(entity) or '' %}");
    expect(result).toContain("{% set label = (labels(entity) | default([]) | join(', ')) %}");
    expect(result).toContain("{% set device_class = state_attr(entity, 'device_class') or '' %}");
    expect(result.endsWith("{{ area }}")).toBe(true);
  });

  it("JSON-encodes the entity id so it is always a valid Jinja string literal", () => {
    // An entity id can't actually contain a quote, but the encoding should
    // still be safe generically rather than assuming that.
    const result = withEntityContext("{{ entity }}", 'sensor.weird"id');
    expect(result).toContain(`{% set entity = ${JSON.stringify('sensor.weird"id')} %}`);
  });
});
