// Local-only regression fixture; synthetic images and no backend writes.
import { sanitizePropertyPhoto } from '../../services/photoSanitizer';
import metadataFixtures from './photo-metadata.json';

const output = document.getElementById('results')!;
const results: { name: string; pass: boolean; detail: string }[] = [];
const record = (name: string, pass: boolean, detail = '') => {
  results.push({ name, pass, detail });
  output.textContent = JSON.stringify(results, null, 2);
};
const text = (bytes: ArrayBuffer) => new TextDecoder('latin1').decode(bytes);

async function run() {
  for (const fixture of metadataFixtures) {
    try {
      const bytes = Uint8Array.from(atob(fixture.data), character => character.charCodeAt(0));
      const original = new File([bytes], fixture.name, { type: fixture.type });
      if (!text(bytes.buffer).includes('ILE_PRIVATE_METADATA_TEST')) throw Error('Missing synthetic metadata');
      const clean = await sanitizePropertyPhoto(original);
      const encoded = text(await clean.arrayBuffer());
      const decoded = await createImageBitmap(clean);
      const pass = clean.type === 'image/jpeg' && decoded.width === 48 && decoded.height === 32 &&
        !encoded.includes('ILE_PRIVATE_METADATA_TEST') && !encoded.includes('Exif') &&
        !encoded.includes('GPS') && !encoded.includes('http://ns.adobe.com/xap/');
      decoded.close();
      record(`${fixture.type}: real decode + metadata removal`, pass, `${original.size} bytes → ${clean.size} bytes; 48×32 JPEG`);
      const again = await sanitizePropertyPhoto(clean);
      record(`${fixture.type}: upload-boundary reprocessing`, again.type === 'image/jpeg' && !text(await again.arrayBuffer()).includes('Exif'));
    } catch (error) { record(fixture.type, false, String(error)); }
  }
  for (const type of ['image/avif', 'image/heic', 'image/gif', 'image/svg+xml']) {
    try {
      await sanitizePropertyPhoto(new File(['invalid'], 'unsupported', { type }));
      record(`${type}: rejected`, false);
    } catch { record(`${type}: rejected`, true); }
  }
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
    try {
      await sanitizePropertyPhoto(new File(['corrupt'], 'corrupt', { type }));
      record(`${type}: corrupt file fails closed`, false);
    } catch { record(`${type}: corrupt file fails closed`, true); }
  }
  document.body.dataset.status = results.every(result => result.pass) ? 'passed' : 'failed';
  document.getElementById('summary')!.textContent = `${results.filter(result => result.pass).length}/${results.length} passed`;
}
run().catch(error => { record('fixture', false, String(error)); document.body.dataset.status = 'failed'; });
