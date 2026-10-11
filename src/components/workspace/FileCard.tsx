import React from 'react';
import {
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  Download,
  Clock,
} from 'lucide-react';
import { ProcessedImageItem } from '../../types/image';
import { formatBytes, formatDimensions, getMimeShortName } from '../../lib/image-engine/file-utils';
import { downloadSingleFile } from '../../lib/image-engine/zip-downloader';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface FileCardProps {
  item: ProcessedImageItem;
  onRemove: (id: string) => void;
  onOpenCompare: (item: ProcessedImageItem) => void;
  lang?: LanguageCode;
}

export const FileCard: React.FC<FileCardProps> = ({
  item,
  onRemove,
  onOpenCompare,
  lang = 'en',
}) => {
  const isComplete = item.status === 'success';
  const isProcessing = item.status === 'processing';
  const isQueued = item.status === 'queued';
  const isError = item.status === 'error';
  const tr = t(lang);

  const resolvedErrorMessage = (() => {
    if (!isError) return null;
    if (item.errorCode === 'DECODE_ERROR') return tr.errDecode;
    if (item.errorCode === 'MEMORY_ERROR') return tr.errMemory;
    if (item.errorCode === 'UNSUPPORTED_FORMAT') return tr.errUnsupported;
    if (item.errorCode === 'DIMENSION_ERROR') return tr.errDimension;
    if (item.errorCode === 'COMPRESSION_ERROR') return tr.errCompression;
    return item.errorMessage || tr.errCompression;
  })();

  return (
    <div
      className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-200 ${
        isComplete
          ? 'border-emerald-500/30 bg-white dark:bg-slate-900/90 shadow-md shadow-emerald-500/5'
          : isProcessing
          ? 'border-cyan-500/40 bg-white dark:bg-slate-900/90 ring-1 ring-cyan-500/30'
          : isError
          ? 'border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      {/* Left: Thumbnail & Details */}
      <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto flex-1">
        {/* Thumbnail with checkerboard background for transparent images */}
        <div
          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950 shadow-inner"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #94a3b822 25%, transparent 25%), linear-gradient(-45deg, #94a3b822 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #94a3b822 75%), linear-gradient(-45deg, transparent 75%, #94a3b822 75%)',
            backgroundSize: '10px 10px',
            backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
          }}
        >
          <img
            src={item.previewUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          {/* Format badge overlay */}
          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[9px] font-mono font-bold uppercase text-white backdrop-blur-xs">
            {getMimeShortName(item.originalFormat)}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={item.name}>
              {item.name}
            </h4>
            {isComplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                <CheckCircle2 className="w-3 h-3" /> {tr.readyStatus}
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" /> {tr.processing}
              </span>
            )}
            {isQueued && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                <Clock className="w-3 h-3" /> {tr.queuedStatus}
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                <AlertCircle className="w-3 h-3" /> {tr.errorStatus}
              </span>
            )}
          </div>

          {/* Error Message if failed */}
          {isError && resolvedErrorMessage && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
              {resolvedErrorMessage}
            </p>
          )}

          {/* Size & Dimension Metrics */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {/* Dimensions */}
            <span>{formatDimensions(item.originalDimensions)}</span>

            {/* Sizes */}
            <span>•</span>
            <span>{formatBytes(item.originalSize)}</span>

            {/* Savings / Result if processed */}
            {isComplete && item.resultSize !== undefined && (
              <>
                <ArrowRight className="w-3 h-3 text-cyan-500" />
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatBytes(item.resultSize)}
                </span>
                {item.savedPercent !== undefined && item.savedPercent > 0 && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    -{item.savedPercent}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 self-end sm:self-center">
        {/* Compare Button */}
        {isComplete && (
          <button
            onClick={() => onOpenCompare(item)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title={tr.compare}
          >
            <Eye className="w-3.5 h-3.5 text-cyan-500" />
            <span>{tr.compare}</span>
          </button>
        )}

        {/* Download Single File */}
        {isComplete && item.resultBlob && (
          <button
            onClick={() => downloadSingleFile(item)}
            className="inline-flex items-center gap-1 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-cyan-400 transition"
            title={tr.download}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{tr.download}</span>
          </button>
        )}

        {/* Remove item button */}
        <button
          onClick={() => onRemove(item.id)}
          disabled={isProcessing}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 transition disabled:opacity-40"
          title="Remove image from workspace"
          aria-label="Remove image"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
