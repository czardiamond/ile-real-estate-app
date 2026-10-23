import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';

let dom, server, ExploreView;
const property = {
  id: 'local-map-actions-only', title: 'Local map action fixture', price: 45000000,
  period: 'total', type: 'Apartment', status: 'Available',
  location: { area: 'Test neighbourhood', city: 'Lagos', state: 'Lagos State' },
  specs: { bedrooms: 2, bathrooms: 2 }, features: [], images: [],
  coordinates: { lat: 6.45, lng: 3.46 }, createdAt: '2026-01-01T00:00:00Z',
};

before(async () => {
  // No resources option: jsdom never fetches map tiles, images or any backend.
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    Object.defineProperty(globalThis, name, { configurable: true, value: typeof dom.window[name] === 'function' && ['getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame'].includes(name) ? dom.window[name].bind(dom.window) : dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  server = await createServer({ configFile: false, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false }, esbuild: { jsx: 'automatic' } });
  ({ default: ExploreView } = await server.ssrLoadModule('/components/ExploreView.tsx'));
});

after(async () => { await server?.close(); dom?.window.close(); });

function button(name) {
  const result = [...document.querySelectorAll('button')].find(element => (element.getAttribute('aria-label') || element.textContent.trim()) === name);
  assert.ok(result, `Expected accessible button: ${name}`);
  return result;
}
async function click(element) {
  await act(async () => { element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })); });
}
async function mount({ openCard = true, properties = [property] } = {}) {
  const calls = { saves: [], enquiries: [], details: [], bubbled: 0, keys: [] };
  function Harness() {
    const [savedIds, setSavedIds] = useState(new Set());
    return React.createElement('div', { onClick: () => { calls.bubbled++; }, onKeyDown: event => calls.keys.push(event.key) },
      React.createElement(ExploreView, {
        properties, savedPropertyIds: savedIds,
        onPropertySelect: item => calls.details.push(item.id),
        onChat: item => calls.enquiries.push(item.id),
        onView3D: () => {}, onViewFloorPlan: () => {},
        onToggleSave: id => {
          calls.saves.push(id);
          setSavedIds(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
        },
      }));
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
  await click(button('Map'));
  const marker = document.querySelector('.leaflet-marker-icon[title="Local map action fixture"]');
  assert.ok(marker, 'Expected local-only listing map marker');
  if (openCard) {
    await click(marker);
    assert.ok(button('Close selected map property'));
  }
  calls.bubbled = 0;
  return { calls, cleanup: async () => { await act(async () => root.unmount()); container.remove(); } };
}

test('selected map card Save toggles callback/state without selecting, closing or bubbling', async () => {
  const { calls, cleanup } = await mount();
  try {
    const save = button(`Save ${property.title}`);
    assert.equal(save.type, 'button');
    assert.equal(save.getAttribute('aria-pressed'), 'false');
    await click(save);
    assert.deepEqual(calls.saves, [property.id]);
    const saved = button(`Remove ${property.title} from saved properties`);
    assert.equal(saved.getAttribute('aria-pressed'), 'true');
    assert.match(saved.textContent, /Saved/);
    assert.ok(button('Close selected map property'), 'Save keeps the selected map card open');
    assert.equal(button('Map').getAttribute('aria-pressed'), 'true');
    await click(saved);
    assert.deepEqual(calls.saves, [property.id, property.id]);
    assert.equal(button(`Save ${property.title}`).getAttribute('aria-pressed'), 'false');
    assert.deepEqual(calls.details, []);
    assert.deepEqual(calls.enquiries, []);
    assert.equal(calls.bubbled, 0);
  } finally { await cleanup(); }
});

test('selected map card Enquire invokes the existing callback once and preserves saved/selection state', async () => {
  const { calls, cleanup } = await mount();
  try {
    await click(button(`Save ${property.title}`));
    const enquire = button(`Enquire about ${property.title}`);
    assert.equal(enquire.type, 'button');
    await click(enquire);
    assert.deepEqual(calls.enquiries, [property.id]);
    assert.deepEqual(calls.saves, [property.id], 'Enquire must not toggle Save');
    assert.equal(button(`Remove ${property.title} from saved properties`).getAttribute('aria-pressed'), 'true');
    assert.ok(button('Close selected map property'), 'Enquire must not close the selected map card');
    assert.equal(button('Map').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(calls.details, []);
    assert.equal(calls.bubbled, 0);
  } finally { await cleanup(); }
});

for (const key of ['Enter', ' ']) {
  test(`price pin ${key === ' ' ? 'Space' : key} activation opens the card and exposes selection state`, async () => {
    const { calls, cleanup } = await mount({ openCard: false });
    try {
      const marker = document.querySelector('.leaflet-marker-icon');
      assert.equal(marker.getAttribute('role'), 'button');
      assert.equal(marker.tabIndex, 0);
      assert.equal(marker.getAttribute('aria-label'), `${property.title} map location`);
      assert.equal(marker.getAttribute('aria-pressed'), 'false');
      marker.focus();
      const event = new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await act(async () => marker.dispatchEvent(event));
      assert.equal(event.defaultPrevented, true, 'Activation prevents scrolling/default duplicate key actions');
      assert.ok(button('Close selected map property'));
      assert.equal(marker.getAttribute('aria-pressed'), 'true');
      assert.equal(document.activeElement, marker, 'Activation preserves keyboard focus on the stable pin');
      assert.deepEqual(calls.keys, [], 'Activation must not reach the map keyboard handler');
      assert.deepEqual(calls.details, []);
      assert.deepEqual(calls.saves, []);
      assert.deepEqual(calls.enquiries, []);
      await click(button('Close selected map property'));
      assert.equal(marker.getAttribute('aria-pressed'), 'false');
    } finally { await cleanup(); }
  });
}

test('price pin arrow keys remain available to map keyboard navigation', async () => {
  const { calls, cleanup } = await mount({ openCard: false });
  try {
    const marker = document.querySelector('.leaflet-marker-icon');
    marker.focus();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      await act(async () => marker.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    }
    assert.deepEqual(calls.keys, ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    assert.equal(marker.getAttribute('aria-pressed'), 'false');
    assert.equal(document.querySelector('[aria-label="Close selected map property"]'), null);
  } finally { await cleanup(); }
});

test('map excludes missing and malformed locations without inventing pins or losing list records', async () => {
  const properties = [property,
    { ...property, id: 'private', title: 'Private location fixture', coordinates: undefined },
    { ...property, id: 'invalid', title: 'Invalid location fixture', coordinates: { lat: NaN, lng: 200 } },
  ];
  const { cleanup } = await mount({ openCard: false, properties });
  try {
    assert.equal(document.querySelectorAll('.leaflet-marker-icon').length, 1);
    assert.match(document.body.textContent, /1 of 3 matching properties have map locations/);
    await click(button('List'));
    assert.match(document.body.textContent, /Private location fixture/);
    assert.match(document.body.textContent, /Invalid location fixture/);
  } finally { await cleanup(); }
});
