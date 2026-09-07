import { defineConfig, devices } from '@playwright/test';

// Visual regression, Platinum item from docs/quality-scale.md. This row
// wraps <state-badge> and (when toggle is set) <ha-entity-toggle> - real
// Home Assistant frontend internals not available outside a running HA
// frontend, so they're stubbed as plain placeholder elements here. That
// means these screenshots verify THIS card's own wrapper/layout/CSS (the
// part it actually controls), not the full visual output a real HA
// instance would produce.
export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__screenshots__',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
