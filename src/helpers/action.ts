/*
`customElements.whenDefined(name)` for an element that never gets defined stays
pending for the lifetime of the page, and the reaction closure attached to it
captures `element`. "long-press" and "action-handler" are legacy frontend
elements that current Home Assistant does not define at all, so every row bound
here left four permanent references behind (two elements x two waits), each one
retaining the row and its entire rendered subtree.

Measured on a dashboard with 200 rows over 5 views, after 20 view switches:
42500 entry points into detached nodes came from these promise reactions.

Because those promises never settle, the callbacks never ran either -- this
binding has been a no-op on any modern frontend. Actions are handled through
_handleAction, taken from the hui-generic-entity-row in the staging area.

So bind only to a handler element that already exists, and never wait.
*/

const LEGACY_HANDLERS = ["long-press", "action-handler"];

export function bindActionHandler(element, options = {}) {
  for (const name of LEGACY_HANDLERS) {
    if (!customElements.get(name)) continue;
    const handler = document.body.querySelector(name) as any;
    handler?.bind?.(element, options);
  }
  return element;
}
