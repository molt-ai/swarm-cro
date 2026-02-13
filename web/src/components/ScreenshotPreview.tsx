'use client';

import { useState } from 'react';

interface ScreenshotPreviewProps {
  url: string;
  changes: string; // JSON string with { css, js }
}

export function ScreenshotPreview({ url, changes }: ScreenshotPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<{
    original?: string;
    optimized?: string;
  }>({});
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<'split' | 'before' | 'after'>('split');

  const generateScreenshots = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 55 second timeout (Vercel functions have 60s max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      
      console.log('[Preview] Starting screenshot generation...');
      
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, changes }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('[Preview] Got response:', res.status);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || `Screenshot failed (${res.status})`);
      }

      const data = await res.json();
      console.log('[Preview] Data received, success:', data.success);
      
      if (data.success === false) {
        throw new Error(data.error || 'Screenshot service unavailable');
      }
      
      if (!data.original) {
        throw new Error('No screenshot returned');
      }
      
      setScreenshots({
        original: data.original,
        optimized: data.optimized,
      });
    } catch (err) {
      console.error('[Preview] Error:', err);
      let errorMsg = 'Failed to generate screenshots';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = 'Request timed out - try again or use a simpler page';
        } else {
          errorMsg = err.message;
        }
      }
      setError(errorMsg);
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
          See before/after comparison with proposed changes applied
        </p>
        <button
          onClick={generateScreenshots}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg text-sm"
        >
          Generate Preview
        </button>
        <p className="text-xs text-gray-600 mt-3">
          Uses Browserbase • Takes ~15 seconds
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3 animate-pulse">📸</div>
        <h3 className="font-medium text-gray-200 mb-2">Generating Preview...</h3>
        <p className="text-sm text-gray-500">
          Opening browser, capturing before/after
        </p>
        <div className="mt-4 w-32 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
          <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-gray-600 mt-3">This may take 15-20 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">❌</div>
        <h3 className="font-medium text-gray-200 mb-2">Preview Failed</h3>
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

  const hasAfter = !!screenshots.optimized;

  return (
    <div className="bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800">
        {hasAfter && (
          <TabButton active={view === 'split'} onClick={() => setView('split')} label="⚡ Compare" />
        )}
        <TabButton active={view === 'before'} onClick={() => setView('before')} label="Before" />
        {hasAfter ? (
          <TabButton active={view === 'after'} onClick={() => setView('after')} label="After ✨" />
        ) : (
          <TabButton active={false} onClick={() => {}} label="After (no CSS)" disabled />
        )}
      </div>

      <div className="p-4">
        {view === 'split' && hasAfter && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1 text-center">Before</p>
                <div className="border border-gray-700 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                  <img 
                    src={`data:image/jpeg;base64,${screenshots.original}`}
                    alt="Before"
                    className="w-full h-auto"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-green-500 mb-1 text-center">After ✨</p>
                <div className="border border-green-600/50 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                  <img 
                    src={`data:image/jpeg;base64,${screenshots.optimized}`}
                    alt="After"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scroll images to see full page
            </p>
          </div>
        )}

        {view === 'before' && screenshots.original && (
          <div className="space-y-2">
            <div className="border border-gray-700 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
              <img 
                src={`data:image/jpeg;base64,${screenshots.original}`}
                alt="Before"
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">Current page</p>
          </div>
        )}

        {view === 'after' && hasAfter && (
          <div className="space-y-2">
            <div className="border border-green-600/50 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
              <img 
                src={`data:image/jpeg;base64,${screenshots.optimized}`}
                alt="After"
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-green-500 text-center">With proposed CSS changes</p>
          </div>
        )}

        <button
          onClick={generateScreenshots}
          className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300"
        >
          ↻ Regenerate Preview
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, disabled }: { 
  active: boolean; 
  onClick: () => void; 
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
        disabled
          ? 'text-gray-600 cursor-not-allowed'
          : active
            ? 'text-purple-400 bg-purple-600/10 border-b-2 border-purple-500'
            : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
