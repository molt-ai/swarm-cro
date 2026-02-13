'use client';

import { useState } from 'react';
import { ScreenshotPreview } from '@/components/ScreenshotPreview';

interface Hypothesis {
  hypothesis: string;
  rationale: string;
  expectedImpact: 'low' | 'medium' | 'high';
}

interface ProposedVariant {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  rationale: string;
  expectedImpact: string;
  changes: {
    type: string;
    target: string;
    property?: string;
    newValue?: string;
    html?: string;
  }[];
}

interface AnalyzeResult {
  url: string;
  pageAnalysis: {
    title: string;
    headings: string[];
    ctas: string[];
    forms: number;
  };
  hypotheses: Hypothesis[];
  proposedVariants: ProposedVariant[];
  duration: number;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError('');
    setResults(null);
    setStatus('analyzing');
    setProgress('Extracting page content...');

    try {
      // Call the real analyze endpoint
      setProgress('AI analyzing page and generating hypotheses...');
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Analysis failed');
      }

      const data = await res.json();
      
      setResults(data);
      setStatus('done');
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
      <header className="px-4 py-4 border-b border-gray-800/50 sticky top-0 bg-gray-950/90 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐝</span>
            <span className="font-bold">SwarmCRO</span>
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">AI-Powered</span>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {status === 'idle' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Optimize Any Website</h1>
              <p className="text-gray-400 text-sm">
                AI analyzes your page and generates CRO hypotheses with real code changes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Website URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Analyze & Generate Variants →
              </button>
            </form>

            <div className="mt-10">
              <h2 className="text-sm font-medium text-gray-400 mb-4">How it works</h2>
              <div className="space-y-3">
                <Step num={1} title="Extract" desc="AI analyzes your page structure" />
                <Step num={2} title="Research" desc="Generates CRO hypotheses based on psychology" />
                <Step num={3} title="Propose" desc="Creates real code changes to test" />
                <Step num={4} title="Export" desc="Copy implementable CSS/JS snippets" />
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                Powered by Claude AI • Based on Cialdini + Fogg psychology principles
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">{error}</p>
            <button
              onClick={handleReset}
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 animate-pulse">🧠</div>
            <h2 className="text-xl font-bold mb-2">Analyzing...</h2>
            <p className="text-gray-400 text-sm">{progress}</p>
            <p className="text-gray-500 text-xs mt-2">This may take 20-40 seconds</p>
            <div className="mt-6 w-48 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
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

function ResultsScreen({ results, onReset }: { results: AnalyzeResult; onReset: () => void }) {
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'variants' | 'preview' | 'code'>('hypotheses');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Generate CSS from variants for preview
  const cssChanges = results.proposedVariants
    .flatMap(v => v.changes)
    .filter(c => c.property === 'style')
    .map(c => `${c.target} { ${c.newValue} }`)
    .join('\n');

  const handleCopyCode = (variant: ProposedVariant, index: number) => {
    const code = generateImplementationCode(variant);
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-4xl mb-2">✨</div>
        <h2 className="text-xl font-bold">Analysis Complete</h2>
        <p className="text-sm text-gray-400 truncate">{results.url}</p>
        <p className="text-xs text-gray-500 mt-1">
          Completed in {(results.duration / 1000).toFixed(1)}s
        </p>
      </div>

      {/* Page Analysis Summary */}
      <div className="bg-gray-900/50 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Page Analysis</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">{results.pageAnalysis.headings.length}</p>
            <p className="text-xs text-gray-500">Headings</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">{results.pageAnalysis.ctas.length}</p>
            <p className="text-xs text-gray-500">CTAs</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">{results.pageAnalysis.forms}</p>
            <p className="text-xs text-gray-500">Forms</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <TabButton 
          active={activeTab === 'hypotheses'} 
          onClick={() => setActiveTab('hypotheses')}
          label={`Hypotheses (${results.hypotheses.length})`}
        />
        <TabButton 
          active={activeTab === 'variants'} 
          onClick={() => setActiveTab('variants')}
          label={`Variants (${results.proposedVariants.length})`}
        />
        <TabButton 
          active={activeTab === 'preview'} 
          onClick={() => setActiveTab('preview')}
          label="📸 Preview"
        />
        <TabButton 
          active={activeTab === 'code'} 
          onClick={() => setActiveTab('code')}
          label="Code"
        />
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === 'hypotheses' && (
          <>
            {results.hypotheses.map((h, i) => (
              <div key={i} className="bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <ImpactBadge impact={h.expectedImpact} />
                  <p className="text-sm font-medium text-gray-200">{h.hypothesis}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{h.rationale}</p>
              </div>
            ))}
          </>
        )}

        {activeTab === 'variants' && (
          <>
            {results.proposedVariants.map((v, i) => (
              <div key={i} className="bg-gray-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-200">{v.name}</h4>
                  <button
                    onClick={() => handleCopyCode(v, i)}
                    className="text-xs bg-purple-600/20 text-purple-400 px-3 py-1 rounded hover:bg-purple-600/30"
                  >
                    {copiedIndex === i ? '✓ Copied!' : 'Copy Code'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">{v.description}</p>
                <div className="space-y-1">
                  {v.changes.slice(0, 3).map((c, j) => (
                    <div key={j} className="text-xs bg-gray-800/50 rounded px-2 py-1">
                      <span className="text-purple-400">{c.type}</span>
                      <span className="text-gray-500"> → </span>
                      <span className="text-gray-400 truncate">{c.target}</span>
                    </div>
                  ))}
                  {v.changes.length > 3 && (
                    <p className="text-xs text-gray-600">+{v.changes.length - 3} more changes</p>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'preview' && (
          <ScreenshotPreview url={results.url} cssChanges={cssChanges} />
        )}

        {activeTab === 'code' && (
          <div className="bg-gray-900/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800/50 flex items-center justify-between">
              <span className="text-sm font-medium">Implementation Code</span>
              <button
                onClick={() => {
                  const allCode = results.proposedVariants.map(v => generateImplementationCode(v)).join('\n\n');
                  navigator.clipboard.writeText(allCode);
                }}
                className="text-xs bg-purple-600/20 text-purple-400 px-3 py-1 rounded hover:bg-purple-600/30"
              >
                Copy All
              </button>
            </div>
            <pre className="p-4 text-xs text-gray-400 overflow-x-auto max-h-64">
              {results.proposedVariants.map(v => generateImplementationCode(v)).join('\n\n')}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <button 
          onClick={onReset}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Analyze Another URL
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'text-purple-400 bg-purple-600/10 border-b-2 border-purple-500'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors = {
    high: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-gray-500/20 text-gray-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${colors[impact as keyof typeof colors] || colors.medium}`}>
      {impact}
    </span>
  );
}

function generateImplementationCode(variant: ProposedVariant): string {
  let code = `/* ${variant.name} */\n/* ${variant.hypothesis} */\n\n`;
  
  for (const change of variant.changes) {
    if (change.type === 'modify' && change.property === 'style') {
      code += `/* Modify: ${change.target} */\n`;
      code += `document.querySelectorAll('${change.target}').forEach(el => {\n`;
      code += `  el.style.cssText += '${change.newValue}';\n`;
      code += `});\n\n`;
    } else if (change.type === 'modify' && change.property === 'textContent') {
      code += `/* Change text: ${change.target} */\n`;
      code += `document.querySelectorAll('${change.target}').forEach(el => {\n`;
      code += `  el.textContent = '${change.newValue}';\n`;
      code += `});\n\n`;
    } else if (change.type === 'add' && change.html) {
      code += `/* Add element near: ${change.target} */\n`;
      code += `const newEl = document.createElement('div');\n`;
      code += `newEl.innerHTML = \`${change.html.substring(0, 200)}...\`;\n`;
      code += `document.querySelector('${change.target}')?.appendChild(newEl);\n\n`;
    }
  }
  
  return code;
}
