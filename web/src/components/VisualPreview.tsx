'use client';

import { useState, useRef, useEffect } from 'react';

interface VisualPreviewProps {
  url: string;
  cssChanges: string;
  changes?: {
    type: string;
    description: string;
    selector?: string;
  }[];
}

export function VisualPreview({ url, cssChanges, changes }: VisualPreviewProps) {
  const [view, setView] = useState<'split' | 'original' | 'optimized' | 'slider' | 'changes'>('split');
  const [sliderPos, setSliderPos] = useState(50);
  const [copied, setCopied] = useState(false);
  const originalRef = useRef<HTMLIFrameElement>(null);
  const optimizedRef = useRef<HTMLIFrameElement>(null);

  // Inject CSS into optimized iframe
  useEffect(() => {
    const injectCSS = () => {
      if (optimizedRef.current?.contentDocument) {
        const doc = optimizedRef.current.contentDocument;
        
        // Remove existing SwarmCRO styles
        const existing = doc.getElementById('swarmcro-optimizations');
        if (existing) existing.remove();
        
        // Inject new styles
        const style = doc.createElement('style');
        style.id = 'swarmcro-optimizations';
        style.textContent = cssChanges;
        doc.head?.appendChild(style);
      }
    };

    // Try to inject after iframe loads
    const iframe = optimizedRef.current;
    if (iframe) {
      iframe.addEventListener('load', injectCSS);
      // Also try immediately in case already loaded
      setTimeout(injectCSS, 500);
      setTimeout(injectCSS, 1500);
    }

    return () => {
      iframe?.removeEventListener('load', injectCSS);
    };
  }, [cssChanges]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cssChanges);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse changes from CSS comments
  const detectedChanges = changes || parseChangesFromCSS(cssChanges);

  return (
    <div className="bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        <TabButton active={view === 'split'} onClick={() => setView('split')} label="Split View" />
        <TabButton active={view === 'slider'} onClick={() => setView('slider')} label="Slider" />
        <TabButton active={view === 'changes'} onClick={() => setView('changes')} label="Changes" />
        <TabButton active={view === 'original'} onClick={() => setView('original')} label="Original" />
        <TabButton active={view === 'optimized'} onClick={() => setView('optimized')} label="Optimized" />
      </div>

      <div className="p-4">
        {/* Split View */}
        {view === 'split' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1 text-center">Before</p>
              <div className="border border-gray-700 rounded-lg overflow-hidden bg-white aspect-[9/16]">
                <iframe
                  ref={originalRef}
                  src={url}
                  className="w-full h-full scale-[0.5] origin-top-left"
                  style={{ width: '200%', height: '200%' }}
                  sandbox="allow-same-origin"
                  title="Original"
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-green-400 mb-1 text-center">After ✨</p>
              <div className="border border-green-600/50 rounded-lg overflow-hidden bg-white aspect-[9/16]">
                <iframe
                  ref={optimizedRef}
                  src={url}
                  className="w-full h-full scale-[0.5] origin-top-left"
                  style={{ width: '200%', height: '200%' }}
                  sandbox="allow-same-origin"
                  title="Optimized"
                />
              </div>
            </div>
          </div>
        )}

        {/* Slider View */}
        {view === 'slider' && (
          <div className="relative">
            <div className="border border-gray-700 rounded-lg overflow-hidden bg-white aspect-[9/16]">
              {/* Original (full width) */}
              <iframe
                src={url}
                className="absolute inset-0 w-full h-full scale-[0.5] origin-top-left"
                style={{ width: '200%', height: '200%' }}
                sandbox="allow-same-origin"
                title="Original"
              />
              {/* Optimized (clipped) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              >
                <iframe
                  ref={optimizedRef}
                  src={url}
                  className="w-full h-full scale-[0.5] origin-top-left"
                  style={{ width: '200%', height: '200%' }}
                  sandbox="allow-same-origin"
                  title="Optimized"
                />
              </div>
              {/* Slider handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-purple-500 cursor-ew-resize"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">↔</span>
                </div>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Original</span>
              <span>Optimized</span>
            </div>
          </div>
        )}

        {/* Changes List */}
        {view === 'changes' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-4">Optimizations applied based on psychology research:</p>
            {detectedChanges.map((change, i) => (
              <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{change.type}</p>
                    <p className="text-xs text-gray-400 mt-1">{change.description}</p>
                    {change.selector && (
                      <code className="text-xs text-purple-400 mt-1 block">{change.selector}</code>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* CSS Code */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-400">CSS Code</p>
                <button
                  onClick={handleCopy}
                  className="text-xs bg-purple-600/20 text-purple-400 px-3 py-1 rounded hover:bg-purple-600/30"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-950 rounded-lg p-3 text-xs text-gray-400 overflow-x-auto max-h-48">
                {cssChanges}
              </pre>
            </div>
          </div>
        )}

        {/* Single Views */}
        {view === 'original' && (
          <div className="border border-gray-700 rounded-lg overflow-hidden bg-white aspect-[9/16]">
            <iframe
              src={url}
              className="w-full h-full scale-[0.5] origin-top-left"
              style={{ width: '200%', height: '200%' }}
              sandbox="allow-same-origin"
              title="Original"
            />
          </div>
        )}

        {view === 'optimized' && (
          <div className="border border-green-600/50 rounded-lg overflow-hidden bg-white aspect-[9/16]">
            <iframe
              ref={optimizedRef}
              src={url}
              className="w-full h-full scale-[0.5] origin-top-left"
              style={{ width: '200%', height: '200%' }}
              sandbox="allow-same-origin"
              title="Optimized"
            />
          </div>
        )}

        {/* Note about cross-origin */}
        {(view === 'split' || view === 'slider' || view === 'optimized') && (
          <p className="text-xs text-gray-600 mt-3 text-center">
            Note: Some sites block iframe embedding. CSS changes shown in code below.
          </p>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? 'text-purple-400 bg-purple-600/10 border-b-2 border-purple-500'
          : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

function parseChangesFromCSS(css: string): { type: string; description: string; selector?: string }[] {
  const changes: { type: string; description: string; selector?: string }[] = [];
  
  // Parse comments for detected/missing principles
  const psychMatch = css.match(/Psychology Score: (\d+)\/100/);
  if (psychMatch) {
    changes.push({
      type: 'Psychology Analysis',
      description: `Fogg Behavior Model score: ${psychMatch[1]}/100`,
    });
  }

  const missingMatch = css.match(/Missing: ([^\n*]+)/);
  if (missingMatch && missingMatch[1].trim()) {
    changes.push({
      type: 'Missing Persuasion Principles',
      description: `Added: ${missingMatch[1].trim()}`,
    });
  }

  // Standard optimizations
  if (css.includes('h1') || css.includes('heading')) {
    changes.push({
      type: 'Headline Enhancement',
      description: 'Improved font weight, line height, and letter spacing for better readability',
      selector: 'h1, h2, .hero-title',
    });
  }

  if (css.includes('button') || css.includes('.cta') || css.includes('submit')) {
    changes.push({
      type: 'CTA Optimization',
      description: 'Enhanced button visibility with gradient, shadow, and hover effects',
      selector: 'button, .cta, [type="submit"]',
    });
  }

  if (css.includes('testimonial') || css.includes('review') || css.includes('proof')) {
    changes.push({
      type: 'Social Proof Emphasis',
      description: 'Added visual distinction to testimonials and reviews',
      selector: '.testimonial, .review, [class*="proof"]',
    });
  }

  if (css.includes('trust') || css.includes('secure') || css.includes('badge')) {
    changes.push({
      type: 'Trust Signal Enhancement',
      description: 'Highlighted security badges and trust indicators',
      selector: '.trust-badge, [class*="secure"]',
    });
  }

  if (css.includes('form') || css.includes('input')) {
    changes.push({
      type: 'Form Simplification',
      description: 'Improved form styling with focus states and better spacing',
      selector: 'form input, form select',
    });
  }

  if (css.includes('scarcity') || css.includes('limited') || css.includes('urgency')) {
    changes.push({
      type: 'Scarcity/Urgency',
      description: 'Applied Cialdini\'s scarcity principle to create urgency',
      selector: '.price, .limited, .countdown',
    });
  }

  return changes;
}
