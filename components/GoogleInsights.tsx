import React, { useEffect, useState } from 'react';
import { Info, ExternalLink, Map, Search, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import type { Property } from '../types';
import { generatePropertyInsights, type PropertyInsightSource } from '../services/geminiService';

interface GoogleInsightsProps {
  property: Property;
}

const GoogleInsights: React.FC<GoogleInsightsProps> = ({ property }) => {
  const [text, setText] = useState('');
  const [sources, setSources] = useState<PropertyInsightSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generatePropertyInsights(property);
      setText(result.text || 'No source-grounded insights were returned.');
      setSources(Array.isArray(result.sources) ? result.sources : []);
    } catch (requestError: any) {
      setError(requestError?.message || 'Property insights are unavailable.');
      setText('');
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadInsights(); }, [property.id]);

  return (
    <section className="bg-white rounded-3xl border border-outline-variant/30 overflow-hidden shadow-sm">
      <header className="bg-primary/5 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"><Sparkles size={16} /></div>
          <h3 className="font-bold text-on-surface">AI-assisted area context</h3>
        </div>
        {loading && <span className="text-xs text-primary">Researching…</span>}
      </header>
      <div className="p-6">
        {loading ? (
          <div className="space-y-3 animate-pulse"><div className="h-4 bg-surface-container rounded w-3/4" /><div className="h-4 bg-surface-container rounded" /><div className="h-4 bg-surface-container rounded w-5/6" /></div>
        ) : error ? (
          <div className="text-sm text-on-surface-variant">
            <p className="flex gap-2 items-start"><Info size={17} className="shrink-0" />{error}</p>
            <button onClick={() => void loadInsights()} className="mt-3 text-primary font-bold">Try again</button>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-on-surface-variant"><Markdown>{text}</Markdown></div>
        )}
        {!loading && sources.length > 0 && (
          <div className="mt-5 pt-4 border-t border-outline-variant/20">
            <h4 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <a key={`${source.uri}-${index}`} href={source.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs font-medium hover:bg-primary-container">
                  {source.kind === 'maps' ? <Map size={12} /> : <Search size={12} />}{source.title || 'Open source'}<ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="bg-surface-container px-6 py-3 text-[11px] text-on-surface-variant">
        AI-generated context may be incomplete. Check linked sources yourself; it is not a title search, valuation, legal opinion, or safety assessment.
      </footer>
    </section>
  );
};

export default GoogleInsights;
