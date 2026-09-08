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
      `workflow_dispatch`-triggered). CalVer (`YYYY.MM.DD.N`), matching
      Sean's other HA repos and now identical to `decluttering-card`'s own
      setup - same `.release.json` + `scripts/set_version.py`/
      `release_config.py`, copied verbatim (already generic). Superseded an
      earlier manual-semver-input version of this workflow, which shipped a
      one-off `v1.5.0` release before this rule was established - that
      release is still published and hasn't been removed.
- [x] Accessibility considered for interactive elements (keyboard activation,
      ARIA role/label on the row's click target)
- [x] Known limitations documented rather than silently assumed away (see
      below)
- [ ] Dependency vulnerabilities from `npm audit` are all in the build
      toolchain (babel/rollup transitive deps), not runtime code shipped to
      the browser - acceptable, but not fully clean; revisit if a maintained
      alternative to the aging Babel-based build pipeline appears

## Platinum (aspirational, not required)

- [x] Visual regression testing, scoped: `playwright.config.ts` +
      `e2e/row-rendering.spec.ts` screenshot this row's own wrapper/layout/CSS
      with `state-badge` stubbed as a plain placeholder (a real Home Assistant
      frontend internal, not available outside a running HA frontend), so
      these verify the part of the rendering this card actually controls, not
      the full visual output a real instance would produce. Baselines seeded
      and verified passing for real in CI 2026-09-07, after fixing a real
      issue the first CI run caught: the row's `:host { display: inline }`
      (correct for its real usage) gave Playwright no stable box to
      screenshot standalone, fixed with a block-display test wrapper. Not
      run locally - the sandboxed environment this was built in has no
      network access to Playwright's browser CDN.
- [x] Live-verified against a real HA instance, not just unit-tested.
      Deployed 2026-09-07/08 to a real HA 2026.9.1 instance (El Rancho
      Assist): the row loads and registers cleanly (`TEMPLATE-ENTITY-ROW
      2026.09.07.1 IS INSTALLED` in the console, no errors) inside a
      `fold-entity-row` block on a live dashboard. The `labels()` Jinja
      function risk noted below was not specifically exercised by anything
      on this instance's dashboards - still worth confirming directly if a
      future template actually calls it.

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
