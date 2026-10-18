// Local Vite harness only. Does not publish properties, call AI, upload files, or authenticate.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AddListingWizard from '../../components/AddListingWizard';
import '../../index.css';
import 'leaflet/dist/leaflet.css';

function Harness() {
  const [calls, setCalls] = useState(0);
  const [outcome, setOutcome] = useState('Not submitted');
  const [pending, setPending] = useState<{ resolve: () => void; reject: (error: Error) => void } | null>(null);
  return <>
    <aside className="p-4 border bg-amber-50" aria-label="Local test controls">
      <h1>Local-only manual publish regression — no AI or voice, no backend writes</h1>
      <p data-testid="calls">Publish calls: {calls}</p>
      <p data-testid="outcome">{outcome}</p>
      <p>Manual-only harness: AI and voice controls are disabled; publish is stubbed locally.</p>
      <button disabled={!pending} onClick={() => { pending?.reject(new Error('Test upload unavailable')); setPending(null); }} className="m-2 p-2 border">Simulate failure</button>
      <button disabled={!pending} onClick={() => { pending?.resolve(); setPending(null); }} className="m-2 p-2 border">Simulate success</button>
    </aside>
    <AddListingWizard aiEnabled={false} initialMode="manual" onCancel={() => setOutcome('Cancelled')} onComplete={async () => {
      setCalls(count => count + 1);
      await new Promise<void>((resolve, reject) => setPending({ resolve, reject }));
      setOutcome('Saved locally by stub only');
    }} />
  </>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
