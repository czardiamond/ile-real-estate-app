import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import React, { act } from 'react';

let dom, server, AddListingWizard, createRoot;
const alerts = [];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'SVGElement', 'File', 'Blob', 'URL', 'alert', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    if (name === 'alert') Object.defineProperty(globalThis, name, { configurable: true, value: message => alerts.push(message) });
    else Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let sequence = 0;
  globalThis.URL.createObjectURL = () => `blob:test-${++sequence}`;
  globalThis.URL.revokeObjectURL = () => {};
  dom.window.HTMLCanvasElement.prototype.getContext = () => ({ fillRect() {}, drawImage() {} });
  dom.window.HTMLCanvasElement.prototype.toBlob = function (callback) {
    callback(new dom.window.Blob(['clean-jpeg'], { type: 'image/jpeg' }));
  };
  ({ createRoot } = await import('react-dom/client'));
  // Importing the real Gemini service initializes Firebase even with AI disabled.
  // This local-only harness must not initialize Auth or contact any backend.
  server = await createServer({
    configFile: false, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false }, esbuild: { jsx: 'automatic' },
    plugins: [{
      name: 'offline-wizard-ai',
      enforce: 'pre',
      resolveId(id) {
        if (/\/services\/geminiService(?:\.ts)?$/.test(id)) return '\0offline-wizard-ai';
        if (/\/ListingLocationPicker(?:\.tsx)?$/.test(id)) return '\0offline-wizard-map';
      },
      load(id) {
        if (id === '\0offline-wizard-map') return 'export default function MapStub() { return null; }';
        if (id === '\0offline-wizard-ai') return `
          const forbidden = () => { throw new Error('AI is forbidden in wizard QA'); };
          export const generateListingFromRawText = forbidden;
          export const processVoiceNoteToListing = forbidden;
          export const transcribeAudioToDescription = forbidden;
        `;
      },
    }],
  });
  ({ default: AddListingWizard } = await server.ssrLoadModule('/components/AddListingWizard.tsx'));
});

after(async () => { await server?.close(); dom?.window.close(); });

function filesInput(input, files) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
}
function file(name, type = 'image/jpeg') { return new File(['source'], name, { type }); }
async function change(input, files) {
  filesInput(input, files);
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}
async function click(element) {
  await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true })));
}
async function fillManualForm() {
  const form = document.querySelector('form');
  const set = (element, value, event = 'input') => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    setter?.call(element, value);
    element.dispatchEvent(new dom.window.Event(event, { bubbles: true }));
  };
  await act(async () => {
    set(form.querySelector('input[placeholder^="e.g. Luxury"]'), 'Test listing');
    set(form.querySelector('input[placeholder="180000000"]'), '1000000');
    set(form.querySelector('input[placeholder^="e.g. Lekki"]'), 'Lekki');
    set(form.querySelector('select[aria-label="Property category"]'), 'RESIDENTIAL', 'change');
  });
  // Subtype options are rendered in response to the category change.
  await act(async () => {
    set(form.querySelector('select[aria-label="Property subtype"]'), 'Apartment', 'change');
    set(form.querySelector('select[aria-label="Price period"]'), 'total', 'change');
    set(form.querySelector('select[aria-label="Property state"]'), 'Lagos State', 'change');
  });
  return form;
}
async function mount(onComplete = async () => {}) {
  alerts.length = 0;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(AddListingWizard, { aiEnabled: false, initialMode: 'manual', onCancel: () => {}, onComplete })));
  return { container, cleanup: async () => { await act(async () => root.unmount()); container.remove(); } };
}


test('photo processing locks the manual fieldset and rejects concurrent selection/publish attempts', async () => {
  const gate = deferred();
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = () => gate.promise;
  let publishes = 0;
  const { cleanup } = await mount(async () => { publishes++; });
  try {
    const form = await fillManualForm();
    const photoInput = [...form.querySelectorAll('input[type="file"]')].find(input => input.multiple);
    await change(photoInput, [file('first.png', 'image/png')]);
    await act(async () => {});
    const fieldset = form.closest('fieldset');
    assert.equal(fieldset.disabled, true);
    assert.equal(fieldset.getAttribute('aria-busy'), 'true');
    assert.equal(form.querySelector('button[type="submit"]').matches(':disabled'), true);
    assert.match(document.querySelector('[role="status"]').textContent, /Preparing photos/);

    await change(photoInput, [file('second.png', 'image/png')]);
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(publishes, 0, 'publication must not start while photo processing is pending');

    gate.resolve({ width: 100, height: 100, close() {} });
    await act(async () => { await tick(); });
    assert.equal(fieldset.disabled, false);
    assert.equal(form.querySelectorAll('img[alt="Property"]').length, 1, 'concurrent selection must not add a second photo');
  } finally {
    // An assertion failure must not strand the next test behind unresolved work.
    await act(async () => { gate.resolve({ width: 100, height: 100, close() {} }); await tick(); });
    globalThis.createImageBitmap = original;
    await cleanup();
  }
});

test('unsupported input fails closed and retains no original file', async () => {
  const { cleanup } = await mount();
  try {
    const form = document.querySelector('form');
    const photoInput = [...form.querySelectorAll('input[type="file"]')].find(input => input.multiple);
    await change(photoInput, [file('unsafe.gif', 'image/gif')]);
    await act(async () => { await tick(); });
    assert.equal(form.querySelectorAll('img[alt="Property"]').length, 0);
    assert.equal(photoInput.value, '', 'file input is cleared after processing');
    assert.equal(document.querySelector('[role="status"]'), null);
  } finally { await cleanup(); }
});

test('sanitized files are passed to publish and removing floorplan clears its media file', async () => {
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => ({ width: 80, height: 60, close() {} });
  let submitted;
  const { cleanup } = await mount(async data => { submitted = data; });
  try {
    const form = await fillManualForm();
    const inputs = [...form.querySelectorAll('input[type="file"]')];
    const photoInput = inputs.find(input => input.multiple);
    const floorInput = inputs.find(input => !input.multiple);
    await change(photoInput, [file('raw.png', 'image/png')]);
    await act(async () => { await tick(); });
    await change(floorInput, [file('plan.png', 'image/png')]);
    await act(async () => { await tick(); });
    assert.equal(form.querySelector('img[alt="Floor Plan"]')?.alt, 'Floor Plan');
    const remove = form.querySelector('button[title="Remove floor plan"]');
    assert.ok(remove);
    await click(remove);
    assert.equal(form.querySelector('img[alt="Floor Plan"]'), null);
    await act(async () => form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    await act(async () => { await tick(); });
    assert.ok(submitted, `manual submit should reach the local callback: ${alerts.join('; ')}`);
    assert.equal(submitted.mediaFiles.images.length, 1);
    assert.equal(submitted.mediaFiles.images[0].type, 'image/jpeg');
    assert.match(submitted.mediaFiles.images[0].name, /\.jpg$/);
    assert.equal(submitted.mediaFiles.floorPlan, undefined, 'removed floorplan must not be sent');
  } finally {
    globalThis.createImageBitmap = original;
    await cleanup();
  }
});
