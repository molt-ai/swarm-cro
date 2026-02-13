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
  const [view, setView] = useState<'original' | 'code'>('original');

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
          Capture the current page to see what you're optimizing
        </p>
        <button
          onClick={generateScreenshots}
          className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg text-sm"
        >
          Capture Screenshot
        </button>
        <p className="text-xs text-gray-600 mt-3">
          Takes ~10 seconds
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3 animate-pulse">📸</div>
        <h3 className="font-medium text-gray-200 mb-2">Capturing Screenshot...</h3>
        <p className="text-sm text-gray-500">
          Fetching page preview
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
        <TabButton active={view === 'original'} onClick={() => setView('original')} label="📷 Current Page" />
        <TabButton active={view === 'code'} onClick={() => setView('code')} label="✨ Apply Changes" />
      </div>

      <div className="p-4">
        {view === 'original' && screenshots.original && (
          <div className="space-y-3">
            <div className="border border-gray-700 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
              <img 
                src={`data:image/jpeg;base64,${screenshots.original}`}
                alt="Original page"
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              Scroll to see full page • Pinch to zoom
            </p>
          </div>
        )}

        {view === 'code' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-medium text-gray-200 text-sm">How to See the "After"</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Copy the code from the <strong>Code</strong> tab and paste it in your browser's 
                    DevTools console while on your site. The changes will apply instantly!
                  </p>
                </div>
              </div>
              
              <div className="text-xs text-gray-400 space-y-2 mt-4 pt-3 border-t border-gray-700">
                <p><strong>Quick steps:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-gray-500">
                  <li>Open your site in a new tab</li>
                  <li>Right-click → Inspect → Console</li>
                  <li>Paste the code and press Enter</li>
                  <li>See your changes live!</li>
                </ol>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 text-center">
              This is safer than auto-modifying your site
            </p>
          </div>
        )}

        <button
          onClick={generateScreenshots}
          className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300"
        >
          ↻ Retake Screenshot
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
