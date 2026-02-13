'use client';

import { useState } from 'react';

interface Variant {
  id: string;
  name: string;
  isControl: boolean;
  css?: string;
  js?: string;
  hypothesis?: string;
}

interface SwarmExperimentProps {
  url: string;
  variants: Variant[];
  onComplete?: (results: ExperimentResults) => void;
}

interface SessionSummary {
  id: string;
  personaName: string;
  variantId: string;
  converted: boolean;
  timeOnPage: number;
  scrollDepth: number;
  clicks: number;
  impression: 'positive' | 'neutral' | 'negative';
  exitReason?: string;
}

interface VariantResult {
  variantId: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  avgTimeOnPage: number;
  avgScrollDepth: number;
  avgClicks: number;
  bounceRate: number;
  engagementScore: number;
  topExitReasons: Array<{ reason: string; count: number }>;
}

interface ExperimentResults {
  winner: string | null;
  confidence: number;
  isSignificant: boolean;
  insights: string[];
  recommendations: string[];
  variantResults: Record<string, VariantResult>;
  totalSessions: number;
}

export function SwarmExperiment({ url, variants, onComplete }: SwarmExperimentProps) {
  const [status, setStatus] = useState<'idle' | 'configuring' | 'running' | 'complete' | 'error'>('idle');
  const [config, setConfig] = useState({
    sessionsPerVariant: 5,
    targetAudience: '',
    personaCount: 5,
    conversionGoal: {
      type: 'click' as const,
      target: '',
      description: '',
    },
  });
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState<{
    completedSessions: number;
    totalSessions: number;
    estimatedTimeRemaining?: number;
    personas?: string[];
  }>({ completedSessions: 0, totalSessions: 0 });
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string>('');

  const startExperiment = async () => {
    setStatus('running');
    setError('');
    setProgress(0);
    setProgressInfo({ completedSessions: 0, totalSessions: config.sessionsPerVariant * variants.length });

    try {
      const res = await fetch('/api/swarm/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          variants: variants.map(v => ({
            id: v.id,
            name: v.name,
            isControl: v.isControl,
            css: v.css,
            js: v.js,
          })),
          conversionGoal: config.conversionGoal,
          sessionsPerVariant: config.sessionsPerVariant,
          targetAudience: config.targetAudience || undefined,
          personaCount: config.personaCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Experiment failed');
      }

      // Handle SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response stream');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const chunk of lines) {
          const eventMatch = chunk.match(/event: (\w+)/);
          const dataMatch = chunk.match(/data: (.+)/);
          
          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = JSON.parse(dataMatch[1]);
            
            switch (event) {
              case 'personas':
                setProgressInfo(prev => ({ ...prev, personas: data.names }));
                break;
              case 'progress':
                setProgress(data.progress);
                setProgressInfo(prev => ({
                  ...prev,
                  completedSessions: data.completedSessions,
                  totalSessions: data.totalSessions,
                  estimatedTimeRemaining: data.estimatedTimeRemaining,
                }));
                break;
              case 'complete':
                setResults({
                  winner: data.winner,
                  confidence: data.confidence,
                  isSignificant: data.isSignificant,
                  insights: data.insights,
                  recommendations: data.recommendations,
                  variantResults: data.variantResults,
                  totalSessions: data.totalSessions,
                });
                setSessions(data.sessions || []);
                setStatus('complete');
                onComplete?.(data);
                break;
              case 'error':
                throw new Error(data.message);
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  if (status === 'idle') {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-xl p-6 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600/30 rounded-lg flex items-center justify-center">
            <span className="text-xl">🐝</span>
          </div>
          <div>
            <h3 className="font-bold text-white">Run Swarm Experiment</h3>
            <p className="text-xs text-purple-300">AI agents will test your variants</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">
          Deploy {variants.length} variants to a swarm of AI personas that will browse, 
          interact, and attempt to convert — giving you real behavioral data.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">{variants.length}</p>
            <p className="text-xs text-gray-500">Variants</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">5-10</p>
            <p className="text-xs text-gray-500">Personas</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <p className="text-lg font-bold text-purple-400">~3min</p>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
        </div>

        <button
          onClick={() => setStatus('configuring')}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Configure Experiment →
        </button>
      </div>
    );
  }

  if (status === 'configuring') {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <span>🔧</span> Configure Experiment
        </h3>

        <div className="space-y-4">
          {/* Conversion Goal */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">What counts as a conversion?</label>
            <input
              type="text"
              value={config.conversionGoal.description}
              onChange={(e) => setConfig({
                ...config,
                conversionGoal: { ...config.conversionGoal, description: e.target.value },
              })}
              placeholder="e.g., User clicks the Sign Up button"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Conversion target (button text or selector)</label>
            <input
              type="text"
              value={config.conversionGoal.target}
              onChange={(e) => setConfig({
                ...config,
                conversionGoal: { ...config.conversionGoal, target: e.target.value },
              })}
              placeholder="e.g., Sign Up, Buy Now, .cta-button"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Target audience (optional)</label>
            <input
              type="text"
              value={config.targetAudience}
              onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
              placeholder="e.g., Tech-savvy millennials, small business owners"
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">Leave blank to use diverse preset personas</p>
          </div>

          {/* Sessions per variant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Sessions per variant</label>
              <select
                value={config.sessionsPerVariant}
                onChange={(e) => setConfig({ ...config, sessionsPerVariant: Number(e.target.value) })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value={3}>3 (quick test)</option>
                <option value={5}>5 (recommended)</option>
                <option value={10}>10 (thorough)</option>
                <option value={20}>20 (statistical)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Number of personas</label>
              <select
                value={config.personaCount}
                onChange={(e) => setConfig({ ...config, personaCount: Number(e.target.value) })}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value={3}>3 personas</option>
                <option value={5}>5 personas</option>
                <option value={8}>8 personas</option>
                <option value={10}>10 personas</option>
              </select>
            </div>
          </div>

          {/* Estimated info */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              <span className="text-purple-400 font-medium">
                {variants.length * config.sessionsPerVariant} total sessions
              </span>
              {' '}• Estimated time: {Math.ceil(variants.length * config.sessionsPerVariant * 0.5)} - {Math.ceil(variants.length * config.sessionsPerVariant * 1)} minutes
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('idle')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg text-sm"
            >
              Back
            </button>
            <button
              onClick={startExperiment}
              disabled={!config.conversionGoal.description || !config.conversionGoal.target}
              className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg text-sm"
            >
              🐝 Launch Swarm
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'running') {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 border border-purple-500/30">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-2xl animate-bounce">🐝</span>
          </div>
          <h3 className="font-bold text-white text-lg">Swarm in Progress</h3>
          <p className="text-sm text-gray-400">AI agents are testing your variants</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              {progressInfo.completedSessions} / {progressInfo.totalSessions} sessions
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>

        {/* Personas list */}
        {progressInfo.personas && progressInfo.personas.length > 0 && (
          <div className="bg-gray-800/30 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-500 mb-2">Active Personas:</p>
            <div className="flex flex-wrap gap-1">
              {progressInfo.personas.map((name, i) => (
                <span key={i} className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-gray-400">
              {progress < 10 ? 'Spawning browser sessions...' :
               progress < 30 ? 'Agents navigating pages...' :
               progress < 70 ? 'Agents interacting with variants...' :
               progress < 95 ? 'Collecting final metrics...' :
               'Analyzing results...'}
            </span>
          </div>
          {progressInfo.estimatedTimeRemaining && progressInfo.estimatedTimeRemaining > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              ~{Math.ceil(progressInfo.estimatedTimeRemaining / 60)} min remaining
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Don't close this page while the experiment runs.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 border border-red-500/30">
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <h3 className="font-bold text-white mb-2">Experiment Failed</h3>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setStatus('configuring')}
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'complete' && results) {
    return <SwarmResults results={results} sessions={sessions} variants={variants} />;
  }

  return null;
}

function SwarmResults({ 
  results, 
  sessions, 
  variants 
}: { 
  results: ExperimentResults; 
  sessions: SessionSummary[];
  variants: Variant[];
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'insights'>('overview');

  const winnerVariant = variants.find(v => v.id === results.winner);
  const controlResult = Object.values(results.variantResults).find(r => 
    variants.find(v => v.id === r.variantId)?.isControl
  );

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>🏆</span> Experiment Complete
            </h3>
            <p className="text-xs text-gray-400">{results.totalSessions} sessions analyzed</p>
          </div>
          {results.winner && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Winner</p>
              <p className="font-bold text-green-400">{winnerVariant?.name || results.winner}</p>
            </div>
          )}
        </div>
      </div>

      {/* Winner Banner */}
      {results.winner && (
        <div className={`p-4 ${results.isSignificant ? 'bg-green-900/20' : 'bg-yellow-900/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              results.isSignificant ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              <span className="text-xl">{results.isSignificant ? '✅' : '⚠️'}</span>
            </div>
            <div>
              <p className="font-medium text-white">
                {results.isSignificant 
                  ? `${winnerVariant?.name || results.winner} wins with ${results.confidence}% confidence`
                  : `${winnerVariant?.name || results.winner} is leading, but needs more data`
                }
              </p>
              <p className="text-xs text-gray-400">
                {results.isSignificant 
                  ? 'Statistically significant result'
                  : `Only ${results.confidence}% confident - run more sessions for significance`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
        <TabButton active={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')} label={`Sessions (${sessions.length})`} />
        <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} label="Insights" />
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Variant comparison */}
            {variants.map(variant => {
              const result = results.variantResults[variant.id];
              if (!result) return null;
              
              const isWinner = variant.id === results.winner;
              const lift = controlResult && !variant.isControl
                ? ((result.conversionRate - controlResult.conversionRate) / Math.max(controlResult.conversionRate, 0.1)) * 100
                : null;

              return (
                <div 
                  key={variant.id}
                  className={`bg-gray-800/30 rounded-lg p-4 ${isWinner ? 'ring-2 ring-green-500/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isWinner && <span className="text-green-400">👑</span>}
                      <span className="font-medium text-white">{variant.name}</span>
                      {variant.isControl && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-400">Control</span>
                      )}
                    </div>
                    {lift !== null && (
                      <span className={`text-sm font-medium ${lift > 0 ? 'text-green-400' : lift < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {lift > 0 ? '+' : ''}{lift.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-purple-400">{result.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Conversion</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{(result.avgTimeOnPage / 1000).toFixed(1)}s</p>
                      <p className="text-xs text-gray-500">Avg Time</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{result.avgScrollDepth.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500">Scroll</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{result.engagementScore}</p>
                      <p className="text-xs text-gray-500">Engagement</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sessions.map(session => (
              <div 
                key={session.id}
                className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    session.converted ? 'bg-green-500/20 text-green-400' :
                    session.impression === 'positive' ? 'bg-blue-500/20 text-blue-400' :
                    session.impression === 'negative' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {session.converted ? '✓' : session.impression === 'negative' ? '✗' : '•'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{session.personaName}</p>
                    <p className="text-xs text-gray-500">
                      {variants.find(v => v.id === session.variantId)?.name} • 
                      {(session.timeOnPage / 1000).toFixed(1)}s • 
                      {session.clicks} clicks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {session.converted ? (
                    <span className="text-xs text-green-400">Converted</span>
                  ) : (
                    <span className="text-xs text-gray-500 truncate max-w-[120px] block">
                      {session.exitReason?.slice(0, 30)}...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {results.insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Key Insights</h4>
                <div className="space-y-2">
                  {results.insights.map((insight, i) => (
                    <div key={i} className="bg-gray-800/30 rounded-lg p-3 flex gap-2">
                      <span className="text-purple-400">💡</span>
                      <p className="text-sm text-gray-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h4>
                <div className="space-y-2">
                  {results.recommendations.map((rec, i) => (
                    <div key={i} className="bg-gray-800/30 rounded-lg p-3 flex gap-2">
                      <span className="text-green-400">→</span>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
