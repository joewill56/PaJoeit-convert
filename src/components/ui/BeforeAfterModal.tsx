import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ArrowLeftRight, ZoomIn, ZoomOut, Check, SlidersHorizontal } from 'lucide-react';
import { ProcessedImageItem } from '../../types/image';
import { formatBytes } from '../../lib/image-engine/file-utils';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface BeforeAfterModalProps {
  item: ProcessedImageItem | null;
  onClose: () => void;
  lang?: LanguageCode;
}

export const BeforeAfterModal: React.FC<BeforeAfterModalProps> = ({
  item,
  onClose,
  lang = 'en',
}) => {
  const tr = t(lang);
  const [sliderPosition, setSliderPosition] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [modalOriginalUrl, setModalOriginalUrl] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Allocate high-res comparison preview only while modal is open, and release immediately on close
  useEffect(() => {
    if (item?.file) {
      const url = URL.createObjectURL(item.file);
      setModalOriginalUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setModalOriginalUrl('');
      };
    }
  }, [item?.file]);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  if (!item || !item.resultUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400">
                {tr.beforeAfterSub}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800 bg-slate-950/70 p-3 px-6 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">{tr.original}</span>
            <span className="font-semibold text-slate-200">{formatBytes(item.originalSize)}</span>
            <span className="text-[11px] text-slate-500 ml-1">({item.originalDimensions.width}×{item.originalDimensions.height})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">{tr.optimized}</span>
            <span className="font-semibold text-cyan-400">{formatBytes(item.resultSize || 0)}</span>
            <span className="text-[11px] text-slate-500 ml-1">({item.resultDimensions?.width}×{item.resultDimensions?.height})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">{tr.spaceSaved}</span>
            <span className="font-bold text-emerald-400">
              {item.savedPercent && item.savedPercent > 0 ? `-${item.savedPercent}%` : '0%'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">{tr.outputFormat}</span>
            <span className="font-semibold text-slate-200">{item.resultFormat}</span>
          </div>
        </div>

        {/* Comparison Canvas Area */}
        <div
          ref={containerRef}
          onMouseDown={() => setIsDragging(true)}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative flex-1 select-none overflow-hidden bg-[#070b12] flex items-center justify-center p-4 min-h-[340px] sm:min-h-[460px] cursor-ew-resize"
        >
          {/* Checkerboard transparency background */}
          <div
            className="relative max-h-[70vh] max-w-full overflow-hidden rounded-lg shadow-lg border border-slate-800"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #131b2e 25%, transparent 25%), linear-gradient(-45deg, #131b2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #131b2e 75%), linear-gradient(-45deg, transparent 75%, #131b2e 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          >
            {/* Background image: Original (Left) */}
            <img
              src={modalOriginalUrl || item.previewUrl}
              alt="Original"
              className="max-h-[65vh] w-auto object-contain block pointer-events-none"
            />

            {/* Foreground image: Optimized (Right clip) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                clipPath: `inset(0 0 0 ${sliderPosition}%)`,
              }}
            >
              <img
                src={item.resultUrl}
                alt="Optimized"
                className="max-h-[65vh] w-auto object-contain block pointer-events-none"
              />
            </div>

            {/* Vertical divider line */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute inset-y-0 -left-[1px] w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]" />

              {/* Central handle badge */}
              <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-xl text-slate-900 border border-slate-300">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-3 left-3 z-10 rounded-md bg-black/60 px-2 py-1 text-[11px] font-mono font-medium text-white backdrop-blur-sm pointer-events-none border border-white/10 uppercase">
              {tr.original}
            </div>
            <div className="absolute top-3 right-3 z-10 rounded-md bg-cyan-950/80 px-2 py-1 text-[11px] font-mono font-medium text-cyan-300 backdrop-blur-sm pointer-events-none border border-cyan-500/30 uppercase">
              {tr.optimized}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="h-1.5 w-32 sm:w-48 cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
            />
            <span className="font-mono text-[11px]">{Math.round(sliderPosition)}%</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            {tr.done}
          </button>
        </div>
      </div>
    </div>
  );
};
