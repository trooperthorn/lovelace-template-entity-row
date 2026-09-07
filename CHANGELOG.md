# Changelog

Hand-maintained (this fork doesn't run semantic-release/conventional-commit
automation like its sibling `decluttering-card` does - see `docs/quality-scale.md`
for why that wasn't imported wholesale here).

## Unreleased

### Added

- Visual editor (`ha-form`) for the non-templated common case - entity, icon,
  name, secondary, state, condition, image, color, toggle, and the three
  actions. This row type never had one before.
- `area`, `label`, `device_class` bound as plain Jinja variables (via a
  preamble prepended to any templated field), alongside the existing
  `user`/`browser`/`hash` context.
- `name` accepts the structured `hass.formatEntityName` shape (HA 2026.4+),
  not just a literal string or a hand-written template.

### Fixed

- `stateColor` was bound as an attribute (`?stateColor=`) instead of a
  property, which `state-badge` silently ignores (it declares the property
  `attribute: false`) - non-light entities never colored by state. Fixed to
  a property binding (`.stateColor=`).
- The options passed to the action-handler binding checked `hold_action` for
  both `hasHold` and `hasDoubleClick`, so `double_tap_action`'s presence was
  never actually consulted.
- Multiline `secondary` text was collapsed by normal HTML whitespace
  handling; now preserved (and still wraps long lines).
- Action-presence checks (deciding whether a row has any click behavior at
  all) now use `hasAction()`, which correctly treats an explicit
  `action: none` as "no action" - the previous checks did not.

### Changed

- Added a defensive dispatch fallback: if the action-handler hijack (see
  `docs/quality-scale.md` for why it's still a hijack) ever finds nothing to
  bind to, dispatch falls back to `custom-card-helpers`' public
  `handleAction()` instead of the row going silently dead.
- Accessibility: the row's text area is a real click target when an action
  is configured but was keyboard-unreachable - added `role="button"`,
  `tabindex`, an `aria-label`, and Enter/Space activation.
- CI added (build matrix + test job) and a test runner (`vitest`) added -
  neither existed in this repo before.
- Swapped the deprecated `rollup-plugin-terser` for the maintained
  `@rollup/plugin-terser`.
- `hacs.json`'s `homeassistant` floor corrected from `0.107.0b1` (2019-era,
  stale) to `2026.4.0`, matching the real floor `formatEntityName` support
  introduced.

## Earlier history

Not tracked here - see the git log before this file was added for the
original `thomasloven/lovelace-template-entity-row` history this fork was
based on.
