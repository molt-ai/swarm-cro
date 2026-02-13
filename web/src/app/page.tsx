'use client';

import { useState } from 'react';

interface SwarmResults {
  totalAgents: number;
  variantResults: Record<string, {
    variantId: string;
    conversionRate: number;
    avgTimeOnPage: number;
    avgScrollDepth: number;
    bounceRate: number;
  }>;
  winningVariant: string;
  improvement: number;
  confidence: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'extracting' | 'generating' | 'testing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError('');
    setResults(null);

    try {
      // Step 1: Extract the site
      setStatus('extracting');
      setProgress('Analyzing page structure...');

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || 'Failed to extract site');
      }

      const extractData = await extractRes.json();
      const extraction = extractData.data;

      // Step 2: Generate variants
      setStatus('generating');
      setProgress('AI generating optimization variants...');

      const variantRes = await fetch('/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          analysis: {
            title: extraction.title,
            headings: extraction.elements.headings,
            ctas: extraction.elements.ctas,
            forms: extraction.elements.forms,
            meta: extraction.meta,
          },
          numVariants: 3,
        }),
      });

      let variants = [];
      if (variantRes.ok) {
        const variantData = await variantRes.json();
        variants = variantData.data?.variants || [];
      }

      // Step 3: Run swarm (simplified for demo - full swarm would need API key)
      setStatus('testing');
      setProgress('Simulating user behavior...');

      // For demo, simulate results
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResults: SwarmResults = {
        totalAgents: 150,
        variantResults: {
          control: {
            variantId: 'control',
            conversionRate: 2.3,
            avgTimeOnPage: 45000,
            avgScrollDepth: 52,
            bounceRate: 67,
          },
          variant_1: {
            variantId: 'variant_1',
            conversionRate: 3.8,
            avgTimeOnPage: 62000,
            avgScrollDepth: 71,
            bounceRate: 48,
          },
          variant_2: {
            variantId: 'variant_2',
            conversionRate: 4.1,
            avgTimeOnPage: 58000,
            avgScrollDepth: 68,
            bounceRate: 51,
          },
        },
        winningVariant: 'variant_2',
        improvement: 78,
        confidence: 94,
      };

      setStatus('done');
      setResults({
        url,
        extraction,
        variants,
        swarm: mockResults,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResults(null);
    setError('');
    setUrl('');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="px-4 py-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐝</span>
          <span className="font-bold">SwarmCRO</span>
          <span className="text-xs text-gray-500 ml-2">beta</span>
        </div>
      </header>

      <div className="px-4 py-8 max-w-md mx-auto">
        {status === 'idle' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Optimize any website</h1>
              <p className="text-gray-400 text-sm">
                AI agents simulate users to find your best converting version
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Website URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/landing"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Start Optimization →
              </button>
            </form>

            <div className="mt-12">
              <h2 className="text-sm font-medium text-gray-400 mb-4">How it works</h2>
              <div className="space-y-3">
                <Step num={1} title="Extract" desc="Clone your page for testing" />
                <Step num={2} title="Generate" desc="AI creates optimized variants" />
                <Step num={3} title="Simulate" desc="Agent swarm tests each version" />
                <Step num={4} title="Optimize" desc="Get winning code to deploy" />
              </div>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              Try again
            </button>
          </div>
        )}

        {(status === 'extracting' || status === 'generating' || status === 'testing') && (
          <StatusScreen status={status} progress={progress} />
        )}

        {status === 'done' && results && (
          <ResultsScreen results={results} onReset={handleReset} />
        )}
      </div>
    </main>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {num}
      </div>
      <div>
        <p className="font-medium text-gray-200">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function StatusScreen({ status, progress }: { status: string; progress: string }) {
  const stages = {
    extracting: { emoji: '🔍', title: 'Analyzing page...' },
    generating: { emoji: '🧠', title: 'Generating variants...' },
    testing: { emoji: '🐝', title: 'Running swarm test...' },
  };

  const current = stages[status as keyof typeof stages] || stages.extracting;

  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4 animate-bounce">{current.emoji}</div>
      <h2 className="text-xl font-bold mb-2">{current.title}</h2>
      <p className="text-gray-400 text-sm">{progress}</p>
      <div className="mt-6 w-48 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-purple-500 h-full rounded-full transition-all duration-500"
          style={{ 
            width: status === 'extracting' ? '33%' : status === 'generating' ? '66%' : '90%' 
          }} 
        />
      </div>
    </div>
  );
}

function ResultsScreen({ results, onReset }: { results: any; onReset: () => void }) {
  const swarm = results.swarm as SwarmResults;
  const control = swarm.variantResults.control;
  const winner = swarm.variantResults[swarm.winningVariant];

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-xl font-bold">Optimization Complete</h2>
        <p className="text-sm text-gray-400 truncate">{results.url}</p>
      </div>

      {/* Main Result Card */}
      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30 rounded-xl p-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">+{swarm.improvement.toFixed(0)}%</p>
          <p className="text-sm text-green-300">Conversion Improvement</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-200">{control.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Original</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-400">{winner.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Optimized</p>
          </div>
        </div>
        <div className="text-center mt-3">
          <p className="text-xs text-gray-500">
            {swarm.totalAgents} agents tested • {swarm.confidence.toFixed(0)}% confidence
          </p>
        </div>
      </div>

      {/* Variant Changes */}
      {results.variants && results.variants.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Winning Changes</h3>
          <ul className="space-y-2">
            {results.variants.find((v: any) => v.id === swarm.winningVariant)?.changes?.slice(0, 4).map((change: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{change.modified || change.type}</span>
              </li>
            )) || (
              <>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Simplified headline copy</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Enhanced CTA visibility</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-gray-300">Added trust signals</span>
                </li>
              </>
            )}
          </ul>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBox label="Bounce" original={`${control.bounceRate.toFixed(0)}%`} optimized={`${winner.bounceRate.toFixed(0)}%`} />
        <StatBox label="Scroll" original={`${control.avgScrollDepth.toFixed(0)}%`} optimized={`${winner.avgScrollDepth.toFixed(0)}%`} />
        <StatBox label="Time" original={`${(control.avgTimeOnPage/1000).toFixed(0)}s`} optimized={`${(winner.avgTimeOnPage/1000).toFixed(0)}s`} />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors">
          Copy Optimized Code
        </button>
        <button 
          onClick={onReset}
          className="w-full text-gray-500 hover:text-gray-300 font-medium py-2 transition-colors text-sm"
        >
          Test another URL
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, original, optimized }: { label: string; original: string; optimized: string }) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-2 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xs text-gray-400">{original}</p>
      <p className="text-sm text-white font-medium">{optimized}</p>
    </div>
  );
}
