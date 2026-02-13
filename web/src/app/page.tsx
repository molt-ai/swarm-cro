'use client';

import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'testing' | 'done'>('idle');
  const [results, setResults] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus('analyzing');
    // TODO: Call API to start analysis
    
    // Simulate for now
    setTimeout(() => {
      setStatus('testing');
      setTimeout(() => {
        setStatus('done');
        setResults({
          original: { conversionRate: 2.3, bounceRate: 67 },
          winner: { 
            conversionRate: 4.1, 
            bounceRate: 52,
            improvement: '+78%',
            changes: [
              'Simplified headline copy',
              'Added social proof badge',
              'Reduced form fields from 5 to 3',
            ]
          }
        });
      }, 3000);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="px-4 py-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐝</span>
          <span className="font-bold">SwarmCRO</span>
        </div>
      </header>

      <div className="px-4 py-8 max-w-md mx-auto">
        {status === 'idle' && (
          <>
            {/* Hero */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">
                Optimize any website
              </h1>
              <p className="text-gray-400 text-sm">
                AI agents simulate 1000+ users to find your best converting version
              </p>
            </div>

            {/* URL Input */}
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

            {/* How it works */}
            <div className="mt-12">
              <h2 className="text-sm font-medium text-gray-400 mb-4">How it works</h2>
              <div className="space-y-3">
                <Step num={1} title="Extract" desc="We clone your page for testing" />
                <Step num={2} title="Generate" desc="AI creates optimized variants" />
                <Step num={3} title="Simulate" desc="1000 AI users test each version" />
                <Step num={4} title="Optimize" desc="Get winning code to copy-paste" />
              </div>
            </div>
          </>
        )}

        {status === 'analyzing' && (
          <StatusScreen
            emoji="🔍"
            title="Analyzing page..."
            subtitle="Extracting HTML, CSS, and identifying conversion elements"
          />
        )}

        {status === 'testing' && (
          <StatusScreen
            emoji="🐝"
            title="Swarm testing..."
            subtitle="500 AI agents simulating user behavior"
            showProgress
          />
        )}

        {status === 'done' && results && (
          <ResultsScreen results={results} url={url} onReset={() => {
            setStatus('idle');
            setResults(null);
            setUrl('');
          }} />
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

function StatusScreen({ emoji, title, subtitle, showProgress }: { 
  emoji: string; 
  title: string; 
  subtitle: string;
  showProgress?: boolean;
}) {
  return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4 animate-bounce">{emoji}</div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-gray-400 text-sm">{subtitle}</p>
      {showProgress && (
        <div className="mt-6 w-48 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
          <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  );
}

function ResultsScreen({ results, url, onReset }: { results: any; url: string; onReset: () => void }) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-xl font-bold">Optimization Complete</h2>
        <p className="text-sm text-gray-400 truncate">{url}</p>
      </div>

      {/* Improvement Card */}
      <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30 rounded-xl p-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">{results.winner.improvement}</p>
          <p className="text-sm text-green-300">Conversion Improvement</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-200">{results.original.conversionRate}%</p>
            <p className="text-xs text-gray-500">Original</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-green-400">{results.winner.conversionRate}%</p>
            <p className="text-xs text-gray-500">Optimized</p>
          </div>
        </div>
      </div>

      {/* Changes */}
      <div className="bg-gray-900/50 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Winning Changes</h3>
        <ul className="space-y-2">
          {results.winner.changes.map((change: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-gray-300">{change}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors">
          Copy Optimized Code
        </button>
        <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors">
          View Detailed Report
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
