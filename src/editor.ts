import { LitElement, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, fireEvent } from "custom-card-helpers";

// Phase D: this row type has never had a visual editor, YAML-only since it
// was written. Every field also accepts a Jinja template string (this
// card's whole reason to exist), which most of ha-form's typed selectors
// (icon, boolean, etc.) would reject or mangle - so this editor deliberately
// uses plain text selectors everywhere except `entity` (safe, and the
// single most useful field to get a real picker for) and the three actions
// (the standard `ui_action` selector already handles a template string
// gracefully by falling through to its own YAML mode). This favors getting
// the common, non-templated case right over a fully typed editor that would
// fight advanced usage.
const SCHEMA = [
  { name: "entity", selector: { entity: {} } },
  { name: "icon", selector: { text: {} } },
  { name: "name", selector: { text: {} } },
  { name: "secondary", selector: { text: {} } },
  { name: "state", selector: { text: {} } },
  { name: "condition", selector: { text: {} } },
  { name: "image", selector: { text: {} } },
  { name: "color", selector: { text: {} } },
  { name: "toggle", selector: { text: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
  { name: "hold_action", selector: { ui_action: {} } },
  { name: "double_tap_action", selector: { ui_action: {} } },
];

const LABELS: Record<string, string> = {
  entity: "Entity",
  icon: "Icon (literal, or a {{ }} template)",
  name: "Name (literal, or a {{ }} template)",
  secondary: "Secondary text",
  state: "State override",
  condition: "Show only if (template evaluating to \"true\")",
  image: "Image (entity_picture URL or template)",
  color: "Icon color",
  toggle: "Toggle (template evaluating to \"true\" shows a toggle instead of state)",
};

@customElement("template-entity-row-editor")
export class TemplateEntityRowEditor extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: Record<string, unknown>;

  public setConfig(config: Record<string, unknown>): void {
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${(s: { name: string }): string => LABELS[s.name] ?? s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    // ha-form includes every schema field in its output, even ones the user
    // never touched - strip empty strings back out so an untouched field
    // doesn't turn into an explicit `field: ""` in the saved config (which
    // would, for several of these fields, behave differently from the field
    // being absent entirely).
    const raw = ev.detail.value as Record<string, unknown>;
    const config: Record<string, unknown> = {
      ...(this._config ?? {}),
      type: "custom:template-entity-row",
    };
    for (const key of Object.keys(raw)) {
      const value = raw[key];
      if (value === "" || value === undefined) {
        delete config[key];
      } else {
        config[key] = value;
      }
    }
    fireEvent(this, "config-changed", { config });
  }
}
