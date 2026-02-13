'use client';

import { useState } from 'react';

interface PreviewCompareProps {
  originalScreenshot: string;
  optimizedScreenshot?: string;
  originalHtml?: string;
  optimizedHtml?: string;
  cssChanges?: string;
}

export function PreviewCompare({
  originalScreenshot,
  optimizedScreenshot,
  cssChanges,
}: PreviewCompareProps) {
  const [view, setView] = useState<'compare' | 'original' | 'optimized' | 'code'>('compare');

  return (
    <div className="bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Tab Buttons */}
      <div className="flex border-b border-gray-800">
        <TabButton 
          active={view === 'compare'} 
          onClick={() => setView('compare')}
          label="Compare"
        />
        <TabButton 
          active={view === 'original'} 
          onClick={() => setView('original')}
          label="Original"
        />
        <TabButton 
          active={view === 'optimized'} 
          onClick={() => setView('optimized')}
          label="Optimized"
        />
        <TabButton 
          active={view === 'code'} 
          onClick={() => setView('code')}
          label="Code"
        />
      </div>

      {/* Preview Content */}
      <div className="p-4">
        {view === 'compare' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1 text-center">Original</p>
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <img 
                  src={`data:image/jpeg;base64,${originalScreenshot}`}
                  alt="Original page"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 text-center">Optimized</p>
              <div className="border border-green-700/50 rounded-lg overflow-hidden">
                {optimizedScreenshot ? (
                  <img 
                    src={`data:image/jpeg;base64,${optimizedScreenshot}`}
                    alt="Optimized page"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-[9/16] bg-gray-800 flex items-center justify-center">
                    <p className="text-gray-500 text-xs">Generating...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'original' && (
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <img 
              src={`data:image/jpeg;base64,${originalScreenshot}`}
              alt="Original page"
              className="w-full h-auto"
            />
          </div>
        )}

        {view === 'optimized' && (
          <div className="border border-green-700/50 rounded-lg overflow-hidden">
            {optimizedScreenshot ? (
              <img 
                src={`data:image/jpeg;base64,${optimizedScreenshot}`}
                alt="Optimized page"
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[9/16] bg-gray-800 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Optimized preview not available</p>
              </div>
            )}
          </div>
        )}

        {view === 'code' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">CSS Overrides</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(cssChanges || '');
                }}
                className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded hover:bg-purple-600/30"
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-64">
              {cssChanges || '/* No CSS changes generated */'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ 
  active, 
  onClick, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string;
}) {
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
