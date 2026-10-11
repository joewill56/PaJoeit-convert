import React from 'react';
import { ArrowRight, FileType } from 'lucide-react';
import { ImageProcessingSettings } from '../../types/image';
import { getExtensionFromMime } from '../../lib/image-engine/file-utils';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface WorkflowBarProps {
  settings: ImageProcessingSettings;
  fileCount: number;
  lang?: LanguageCode;
}

export const WorkflowBar: React.FC<WorkflowBarProps> = ({
  settings,
  fileCount,
  lang = 'en',
}) => {
  const tr = t(lang);

  // Format step label
  let formatLabel = tr.originalFormat;
  if (settings.outputFormat !== 'original') {
    formatLabel = getExtensionFromMime(settings.outputFormat).toUpperCase();
  }

  // Dimension step label
  let dimensionLabel = tr.originalSize;
  if (settings.resizeEnabled) {
    if (settings.resizeWidth && settings.resizeHeight) {
      dimensionLabel = `${settings.resizeWidth}×${settings.resizeHeight}px`;
    } else if (settings.resizeWidth) {
      dimensionLabel = `${settings.resizeWidth}px`;
    } else if (settings.resizeHeight) {
      dimensionLabel = `${settings.resizeHeight}px`;
    } else if (settings.resizeScalePercent) {
      dimensionLabel = `${settings.resizeScalePercent}%`;
    }
  }

  // Compression step label
  let compLabel = `${Math.round(settings.quality * 100)}%`;
  if (settings.targetSizeEnabled && settings.targetSizeKB) {
    compLabel = `≤ ${settings.targetSizeKB} KB`;
  } else if (settings.compressionPreset === 'none') {
    compLabel = '100%';
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 p-3 px-4 text-xs backdrop-blur-xs shadow-xs">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          {tr.activeWorkflow}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        {/* Step 1: Input */}
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
          <FileType className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          {tr.selectedImagesCount(fileCount)}
        </span>

        <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />

        {/* Step 2: Format */}
        <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 dark:bg-cyan-950/60 border border-cyan-500/20 dark:border-cyan-800/40 px-2.5 py-1 font-semibold text-cyan-700 dark:text-cyan-300">
          {formatLabel}
        </span>

        <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />

        {/* Step 3: Resize */}
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
          {dimensionLabel}
        </span>

        <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />

        {/* Step 4: Compression */}
        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">
          {compLabel}
        </span>

        <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />

        {/* Step 5: Output */}
        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/20 dark:border-emerald-800/40 px-2.5 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
          {tr.download} / ZIP
        </span>
      </div>
    </div>
  );
};
