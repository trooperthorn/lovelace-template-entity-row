import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// This package is ESM ("type": "module" in package.json) - __dirname isn't
// defined; import.meta.dirname is the ESM equivalent (Node 20.11+/21.2+).
const BUNDLE = readFileSync(join(import.meta.dirname, '../template-entity-row.js'), 'utf-8');

// state-badge (and ha-entity-toggle, when toggle: true) are real Home
// Assistant frontend internals not available outside a running HA frontend.
// Stubbed here as plain placeholders so these screenshots verify this card's
// OWN wrapper/layout/CSS - the part it actually controls - not the full
// visual output a real HA instance would produce for the icon itself.
const PAGE = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body{margin:0;padding:16px;background:#fff;font-family:sans-serif;}
  state-badge{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#ddd;border-radius:50%;}
</style>
</head><body>
<script>
  customElements.define('state-badge', class extends HTMLElement {});
</script>
<template-entity-row></template-entity-row>
<script type="module">${BUNDLE}</script>
</body></html>`;

test.beforeEach(async ({ page }) => {
  await page.setContent(PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => customElements.get('template-entity-row') !== undefined);
});

test('renders name, secondary text, and state from a literal config', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.querySelector('template-entity-row') as any;
    el.hass = { states: {} };
    el.setConfig({
      type: 'custom:template-entity-row',
      name: 'Kitchen Leak Sensor',
      secondary: 'Line one\nLine two',
      state: 'Dry',
    });
  });
  await page.waitForTimeout(50);
  await expect(page.locator('template-entity-row')).toHaveScreenshot('literal-config.png');
});

test('hides the row entirely when condition evaluates to a non-true literal', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.querySelector('template-entity-row') as any;
    el.hass = { states: {} };
    el.setConfig({
      type: 'custom:template-entity-row',
      name: 'Hidden Row',
      condition: 'false',
    });
  });
  await page.waitForTimeout(50);
  await expect(page.locator('template-entity-row')).toHaveScreenshot('condition-hidden.png');
});
