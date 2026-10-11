import React from 'react';
import { Loader2, Cpu } from 'lucide-react';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface ProcessingOverlayProps {
  currentIndex: number;
  totalCount: number;
  currentFileName: string;
  stepMessage?: string;
  overallProgress: number; // 0 to 100
  lang?: LanguageCode;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  currentIndex,
  totalCount,
  currentFileName,
  stepMessage = 'Processing pixels in browser memory...',
  overallProgress,
  lang = 'en',
}) => {
  const tr = t(lang);

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 text-center animate-in fade-in duration-200">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/30 mb-4 animate-bounce">
        <Cpu className="w-7 h-7" />
      </div>

      <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>{tr.processingInBrowser}</span>
      </div>

      <h3 className="text-xl font-bold text-white tracking-tight">
        {tr.processingCountOf(currentIndex, totalCount)}
      </h3>

      <p className="mt-1 text-xs text-slate-400 font-mono truncate max-w-md mx-auto">
        {tr.workingOn} <span className="text-slate-200 font-semibold">{currentFileName}</span>
      </p>

      {/* Progress Bar Container */}
      <div className="mt-6 max-w-lg mx-auto space-y-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 p-0.5 border border-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-300 shadow-sm"
            style={{ width: `${Math.max(5, overallProgress)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 font-mono px-1">
          <span>{stepMessage}</span>
          <span className="font-bold text-cyan-400">{Math.round(overallProgress)}%</span>
        </div>
      </div>
    </div>
  );
};
