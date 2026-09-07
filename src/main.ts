import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { handleAction, hasAction } from "custom-card-helpers";
import { bindActionHandler } from "./helpers/action";
import pjson from "../package.json";
import {
  bind_template,
  unbind_template,
  hasTemplate,
} from "./helpers/templates";
import { hass } from "./helpers/hass";

const OPTIONS = [
  "icon",
  "active",
  "name",
  "secondary",
  "state",
  "condition",
  "image",
  "entity",
  // Set color to a hs-color value ("[<hue>,<saturation>]") with hue in the
  // range 0-360 and saturation 0-100. Works only if entity is unset and
  // active is set.
  "color",
  "toggle",
  "tap_action",
  "hold_action",
  "double_tap_action",
];

const LOCALIZE_PATTERN = /_\([^)]*\)/g;

// Phase B: bind area/label/device_class as plain Jinja variables, in the same
// convenience-context slot helpers/templates.ts already uses for
// user/browser/hash, so a template can write `{{ area }}` instead of
// `{{ area_name(config.entity) }}` every time. Resolved via a Jinja preamble
// rather than a JS-side registry lookup (like decluttering-card's
// registry-lookup.ts needs), since this card already has a real backend
// Jinja renderer to lean on - `area_name()`/`state_attr()` are long-stable
// HA template functions; `labels()` (entity -> label ids) is newer and is
// the one piece of this that still needs checking against a live instance.
export function withEntityContext(templateStr: string, entityId: string | undefined): string {
  if (!entityId) return templateStr;
  const entityLiteral = JSON.stringify(entityId);
  return (
    `{% set entity = ${entityLiteral} %}` +
    `{% set area = area_name(entity) or '' %}` +
    `{% set label = (labels(entity) | default([]) | join(', ')) %}` +
    `{% set device_class = state_attr(entity, 'device_class') or '' %}` +
    templateStr
  );
}

const translate = (hass, text: String) => {
  return text.replace(LOCALIZE_PATTERN, (key) => {
    const params = key
      .substring(2, key.length - 1)
      .split(new RegExp(/\s*,\s*/));
    return hass.localize.apply(null, params) || key;
  });
};

class TemplateEntityRow extends LitElement {
  @property() _config;
  @property() hass;
  @property() config; // Rendered configuration of the row to display
  @property() _action;

  /*
  Strong references to the callbacks this row registered.

  The shared template cache holds callbacks WEAKLY (see helpers/templates.ts),
  so this array is what keeps template updates flowing while the row is alive --
  and it is what lets us unsubscribe again on disconnect. Previously the
  callbacks were anonymous closures passed straight to bind_template() and never
  referenced anywhere, so nothing could unbind them: every row this card ever
  created stayed reachable from window.cardMod_template_cache for the lifetime
  of the page, together with its whole subtree.
  */
  _templateCallbacks: Array<(res: any) => void> = [];

  setConfig(config) {
    this._config = { ...config };
    this.config = { ...this._config };

    // A previous config's callbacks are no longer wanted.
    this._unbindTemplates();
    this.bind_templates();
  }

  async bind_templates() {
    const hs = await hass();
    for (const k of OPTIONS) {
      if (!this._config[k]) continue;
      if (hasTemplate(this._config[k])) {
        const callback = (res) => {
          const state = { ...this.config };
          if (typeof res === "string") res = translate(hs, res);
          state[k] = res;
          this.config = state;
        };
        this._templateCallbacks.push(callback);
        const templateStr = withEntityContext(this._config[k], this._config.entity);
        bind_template(callback, templateStr, { config: this._config });
      } else if (typeof this._config[k] === "string") {
        this.config[k] = translate(hs, this._config[k]);
      }
    }
    this.requestUpdate();
  }

  _unbindTemplates() {
    for (const callback of this._templateCallbacks) unbind_template(callback);
    this._templateCallbacks = [];
  }

  connectedCallback() {
    super.connectedCallback();
    // Rows can be detached and re-attached (a collapsed fold-entity-row, a view
    // being revisited), so re-subscribe if we let go on the way out.
    if (this._config && this._templateCallbacks.length === 0)
      this.bind_templates();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unbindTemplates();
  }

  async firstUpdated() {
    // Hijack the action handler from the hidden generic entity row in the #staging area.
    //
    // This still has to be a hijack, not a clean replacement: the gesture
    // DETECTION half (tap vs. hold vs. double-tap, via HA's internal
    // action-handler-directive) is not published anywhere a third-party card
    // can import it from - custom-card-helpers only exports the DISPATCH
    // half (handleAction/handleActionConfig below), which needs an action
    // name already decided. hui-generic-entity-row wires up the real
    // directive internally on its own markup, so hijacking its bound
    // _handleAction (an arrow-function class field, so it stays correctly
    // bound to gen_row's own hass/config when called from here) remains the
    // practical way to reuse that detection.
    const gen_row = this.shadowRoot.querySelector(
      "#staging hui-generic-entity-row"
    ) as any;
    if (!gen_row) return;
    await gen_row.updateComplete;
    this._action = gen_row._handleAction;

    // hasAction() (from custom-card-helpers) correctly treats an explicit
    // `action: none` as "no action", unlike a plain truthy check - the
    // previous options object also had a bug here: hasDoubleClick checked
    // hold_action instead of double_tap_action.
    const options = {
      hasHold: hasAction(this._config.hold_action),
      hasDoubleClick: hasAction(this._config.double_tap_action),
    };
    if (
      this.config.entity ||
      hasAction(this._config.tap_action) ||
      hasAction(this._config.hold_action) ||
      hasAction(this._config.double_tap_action)
    ) {
      bindActionHandler(this.shadowRoot.querySelector("state-badge"), options);
      bindActionHandler(this.shadowRoot.querySelector(".info"), options);
    }
  }

  _actionHandler(ev) {
    if (this._action) return this._action(ev);
    // Defensive fallback: if a future Home Assistant version restructures
    // hui-generic-entity-row and the hijack above finds nothing to bind to,
    // still dispatch tap/hold/double_tap through the same public
    // handleAction() the hijack would otherwise have used internally -
    // degrades to "the row still does something" instead of a silently
    // dead row.
    const action = ev?.detail?.action;
    if (!action || !this.hass) return undefined;
    return handleAction(this, this.hass, this.config, action);
  }

  // Accessibility: the `.info` div is a real click target (has_action) but
  // was keyboard-unreachable - a mouse-only row on a card type used
  // throughout a dashboard is a real gap, not a cosmetic one. Enter/Space
  // triggers the same tap action a click would.
  _keyHandler(ev: KeyboardEvent) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    ev.preventDefault();
    this._actionHandler({ detail: { action: "tap" } });
  }

  render() {
    const base = this.hass.states[this.config.entity];
    const entity = (base && JSON.parse(JSON.stringify(base))) || {
      entity_id: "binary_sensor.",
      attributes: { icon: "no:icon", friendly_name: "" },
      state: "off",
    };

    const icon =
      this.config.icon !== undefined
        ? this.config.icon || "no:icon"
        : undefined;
    const image = this.config.image;
    let color = this.config.color;

    // `name` can be a plain string (or a Jinja template resolving to one,
    // handled entirely in bind_templates - a config value that isn't a
    // string never reaches hasTemplate's string check, so an object survives
    // untouched here) or the structured EntityNameItem shape hass.
    // formatEntityName accepts (available since HA 2026.4) - the same
    // registry-composed naming built-in cards use, e.g.
    // `name: [{type: area}, {type: entity}]`.
    const nameConfig = this.config.name;
    const name =
      nameConfig && typeof nameConfig === "object"
        ? (this.hass.formatEntityName?.(entity, nameConfig) ??
            entity?.attributes?.friendly_name ??
            entity?.entity_id)
        : nameConfig ?? entity?.attributes?.friendly_name ?? entity?.entity_id;
    const secondary = this.config.secondary;
    const state = this.config.state ?? base?.state;
    let stateColor = true;

    const active = this.config.active ?? false;
    if (active) {
      entity.attributes.brightness = 255;
      entity.state = "on";
    }
    if (this.config.active === false) {
      entity.state = "off";
      stateColor = false;
    }

    const hidden =
      this.config.condition !== undefined &&
      String(this.config.condition).toLowerCase() !== "true";
    const show_toggle = this.config.toggle && this.config.entity;
    const has_action =
      this.config.entity ||
      hasAction(this.config.tap_action) ||
      hasAction(this.config.hold_action) ||
      hasAction(this.config.double_tap_action);

    return html`
      <div id="wrapper" class="${hidden ? "hidden" : ""}">
        <state-badge
          .hass=${this.hass}
          .stateObj=${entity}
          @action=${this._actionHandler}
          .overrideIcon=${icon}
          .overrideImage=${image}
          .color=${color}
          class=${classMap({ pointer: has_action })}
          .stateColor=${stateColor}
        ></state-badge>
        <div
          class=${classMap({ info: true, pointer: has_action })}
          @action="${this._actionHandler}"
          @keydown=${has_action ? this._keyHandler : undefined}
          role=${has_action ? "button" : "presentation"}
          tabindex=${has_action ? "0" : "-1"}
          aria-label=${typeof name === "string" ? name : ""}
        >
          ${name}
          <div class="secondary">${secondary}</div>
        </div>
        <div class="state">
          ${show_toggle
            ? html`<ha-entity-toggle .hass=${this.hass} .stateObj=${entity}>
              </ha-entity-toggle>`
            : state}
        </div>
      </div>
      <div id="staging">
        <hui-generic-entity-row .hass=${this.hass} .config=${this.config}>
        </hui-generic-entity-row>
      </div>
    `;
  }

  static get styles() {
    return [
      (customElements.get("hui-generic-entity-row") as any)?.styles,
      css`
        :host {
          display: inline;
        }
        #wrapper {
          display: flex;
          align-items: center;
          flex-direction: row;
        }
        .state {
          text-align: right;
        }
        /*
        A templated \`secondary\` can legitimately contain newlines (a Jinja
        template producing multiple lines of status text). Normal HTML
        collapses them; this preserves them while still wrapping long lines,
        unlike upstream's #84 draft fix, which used the harder "pre" value
        and only applied it when the row happened to be clickable - multiline
        secondary text is a display concern, not an interactivity one.
        */
        .secondary {
          white-space: pre-line;
        }
        #wrapper {
          min-height: 40px;
        }
        #wrapper.hidden {
          display: none;
        }
        #staging {
          display: none;
        }
      `,
    ];
  }
}

if (!customElements.get("template-entity-row")) {
  customElements.define("template-entity-row", TemplateEntityRow);
  console.info(
    `%cTEMPLATE-ENTITY-ROW ${pjson.version} IS INSTALLED`,
    "color: green; font-weight: bold",
    ""
  );
}
