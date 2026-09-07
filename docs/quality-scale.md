# Quality scale

Home Assistant's own [integration quality scale](https://developers.home-assistant.io/docs/core/integration-quality-scale/)
only applies to backend integrations, not Lovelace frontend cards - there's
no official equivalent for this repo to target. This adapts the same idea
(Bronze/Silver/Gold/Platinum, each a real bar rather than a badge) to what
actually matters for a HACS-distributed frontend card, and tracks this
repo's status against it honestly - including where it's short.

## Bronze

- [x] README documents configuration
- [x] LICENSE present
- [x] CI runs on every PR (lint, build)
- [x] `hacs.json` present and accurate (`homeassistant` floor corrected from
      a stale `0.107.0b1` to `2026.4.0` - the real floor `formatEntityName`
      support needs)
- [x] No long-abandoned or deprecated direct dependencies

## Silver

- [x] A real test suite covering core logic (`withEntityContext`, `hasTemplate`)
- [x] CI runs tests, not just lint/build
- [x] CHANGELOG maintained
- [x] Issue templates for bug reports and feature requests

## Gold

- [x] Tagged, versioned GitHub Releases HACS can install a specific version
      from, not just whatever's on the default branch (`release.yml`,
      `workflow_dispatch`-triggered)
- [x] Accessibility considered for interactive elements (keyboard activation,
      ARIA role/label on the row's click target)
- [x] Known limitations documented rather than silently assumed away (see
      below)
- [ ] Dependency vulnerabilities from `npm audit` are all in the build
      toolchain (babel/rollup transitive deps), not runtime code shipped to
      the browser - acceptable, but not fully clean; revisit if a maintained
      alternative to the aging Babel-based build pipeline appears

## Platinum (aspirational, not required)

- [ ] Visual regression testing - not yet started
- [ ] Live-verified against a real HA instance, not just unit-tested

## Known limitations (Gold requires documenting these, not hiding them)

- **`labels()` (the Jinja function resolving an entity's labels) is newer
  than `area_name()`/`state_attr()`** and hasn't been checked against a live
  `render_template` call on a real instance. If it doesn't exist on some HA
  version, the `label` context variable in `withEntityContext` will render
  empty (or template rendering will error) - worth confirming live before
  depending on it in a production dashboard.
- **The action-handler mechanism is still a hijack, not a clean public API.**
  `custom-card-helpers` only publishes the dispatch half (`handleAction`),
  not gesture detection (tap vs. hold vs. double-tap timing), which lives
  only inside Home Assistant's own frontend and isn't published anywhere a
  third-party card can import. This card reuses `hui-generic-entity-row`'s
  internal `_handleAction` for detection, with a defensive fallback to the
  public `handleAction()` if that hijack ever finds nothing to bind to. This
  is the practical approach today, not a defect, but it's inherently coupled
  to an HA internal that could change without notice.
- **This fork does not run semantic-release / enforce conventional commits**
  the way its sibling `decluttering-card` fork does. That's a deliberate
  choice, not an oversight: this repo's commit history (much of it inherited
  from upstream) doesn't follow that convention, and retrofitting it wasn't
  worth the process change for what this fork needs. `release.yml` gives the
  same *outcome* (a real tagged, versioned GitHub Release) via a manual
  version input instead.
