'use client';

import { useState } from 'react';

interface ScreenshotPreviewProps {
  url: string;
  cssChanges: string;
}

export function ScreenshotPreview({ url, cssChanges }: ScreenshotPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<{
    original?: string;
    optimized?: string;
  }>({});
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<'split' | 'original' | 'optimized'>('split');

  const generateScreenshots = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, cssChanges }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || err.error || 'Screenshot failed');
      }

      const data = await res.json();
      setScreenshots({
        original: data.original,
        optimized: data.optimized,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate screenshots');
    } finally {
      setLoading(false);
    }
  };

  if (!screenshots.original && !loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">📸</div>
        <h3 className="font-medium text-gray-200 mb-2">Visual Preview</h3>
        <p className="text-sm text-gray-500 mb-4">
          Generate before/after screenshots to see how the changes look
        </p>
        <button
          onClick={generateScreenshots}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg text-sm"
        >
          Generate Screenshots
        </button>
        <p className="text-xs text-gray-600 mt-3">
          Uses Browserbase • Takes ~30 seconds
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3 animate-pulse">📸</div>
        <h3 className="font-medium text-gray-200 mb-2">Generating Screenshots...</h3>
        <p className="text-sm text-gray-500">
          Opening browser and capturing pages
        </p>
        <div className="mt-4 w-32 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
          <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">❌</div>
        <h3 className="font-medium text-gray-200 mb-2">Screenshot Failed</h3>
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={generateScreenshots}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800">
        <TabButton active={view === 'split'} onClick={() => setView('split')} label="Compare" />
        <TabButton active={view === 'original'} onClick={() => setView('original')} label="Before" />
        <TabButton active={view === 'optimized'} onClick={() => setView('optimized')} label="After" />
      </div>

      <div className="p-4">
        {view === 'split' && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Current Page</p>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <img 
                  src={`data:image/jpeg;base64,${screenshots.original}`}
                  alt="Original page"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-2">Proposed Changes (Copy code to apply)</p>
              <p className="text-xs text-gray-500">
                Full visual comparison requires running changes in a real browser. 
                Use the "Code" tab to copy and test locally.
              </p>
            </div>
          </div>
        )}

        {view === 'original' && screenshots.original && (
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <img 
              src={`data:image/jpeg;base64,${screenshots.original}`}
              alt="Original page"
              className="w-full h-auto"
            />
          </div>
        )}

        {view === 'optimized' && (
          <div className="border border-green-600/50 rounded-lg overflow-hidden">
            {screenshots.optimized ? (
              <img 
                src={`data:image/jpeg;base64,${screenshots.optimized}`}
                alt="Optimized page"
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[9/16] bg-gray-800 flex items-center justify-center">
                <p className="text-gray-500 text-sm">No CSS changes to preview</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={generateScreenshots}
          className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300"
        >
          ↻ Regenerate Screenshots
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
