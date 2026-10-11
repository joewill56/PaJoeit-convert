import React, { useState, useRef } from 'react';
import {
  Play,
  Trash2,
  Sliders,
  Loader2,
  Layers,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import { ImageProcessingSettings, ProcessedImageItem } from '../../types/image';
import { FileCard } from './FileCard';
import { SettingsPanel } from './SettingsPanel';
import { WorkflowBar } from './WorkflowBar';
import { ProcessingOverlay } from './ProcessingOverlay';
import { ResultsPanel } from './ResultsPanel';
import { Dropzone } from '../upload/Dropzone';
import { BeforeAfterModal } from '../ui/BeforeAfterModal';
import { processSingleImage, ImageProcessingError } from '../../lib/image-engine/canvas-engine';
import { downloadAllAsZip } from '../../lib/image-engine/zip-downloader';
import { isSupportedImageFile } from '../../lib/image-engine/file-utils';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface FileWorkspaceProps {
  items: ProcessedImageItem[];
  setItems: React.Dispatch<React.SetStateAction<ProcessedImageItem[]>>;
  globalSettings: ImageProcessingSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<ImageProcessingSettings>>;
  onAddFiles: (files: File[]) => void;
  onClearAll: () => void;
  lang?: LanguageCode;
  batchLimitWarning?: string | null;
  onDismissLimitWarning?: () => void;
}

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({
  items,
  setItems,
  globalSettings,
  setGlobalSettings,
  onAddFiles,
  onClearAll,
  lang = 'en',
  batchLimitWarning = null,
  onDismissLimitWarning,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState('');
  const [currentStepMessage, setCurrentStepMessage] = useState('');
  const [overallProgress, setOverallProgress] = useState(0);
  const [compareItem, setCompareItem] = useState<ProcessedImageItem | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipErrorMessage, setZipErrorMessage] = useState<string | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const tr = t(lang);

  const successCount = items.filter((i) => i.status === 'success' && i.resultBlob).length;
  const failedCount = items.filter((i) => i.status === 'error').length;
  const hasFinishedBatch =
    !isProcessing &&
    items.length > 0 &&
    (successCount > 0 || failedCount > 0) &&
    items.every((i) => i.status === 'success' || i.status === 'error');

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.resultUrl && target.resultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.resultUrl);
      }
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleApplyToAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        settings: { ...globalSettings },
      }))
    );
  };

  const handleSettingsChange = (newSettings: ImageProcessingSettings) => {
    setGlobalSettings(newSettings);
    // Propagate settings to any idle items so they process with the new settings
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'idle'
          ? { ...item, settings: { ...newSettings } }
          : item
      )
    );
  };

  /**
   * Concurrency = 1 Queue Manager.
   * Processes items sequentially: Image 1 -> decode -> process -> release -> Image 2.
   * Never decodes multiple images simultaneously.
   * Automatically retries once per image on transient memory issues.
   * Continues processing remaining queue even if one image fails.
   */
  const runQueue = async (targetItems: ProcessedImageItem[]) => {
    if (isProcessing || targetItems.length === 0) return;
    setIsProcessing(true);
    setOverallProgress(0);
    setZipErrorMessage(null);

    const totalToProcess = targetItems.length;

    // Mark pending items as 'queued'
    setItems((prev) =>
      prev.map((item) =>
        targetItems.some((t) => t.id === item.id)
          ? { ...item, status: 'queued', progress: 0, errorMessage: undefined, errorCode: undefined }
          : item
      )
    );

    for (let i = 0; i < targetItems.length; i++) {
      const target = targetItems[i];
      setCurrentProcessingIndex(i + 1);
      setCurrentProcessingFile(target.name);

      // If item was already processed, revoke old result URL to release memory
      if (target.resultUrl && target.resultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.resultUrl);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, status: 'processing', progress: 0 } : item
        )
      );

      let attempt = 0;
      let isSuccess = false;

      // Max 1 retry per image on transient memory errors (Requirement 9)
      while (attempt < 2 && !isSuccess) {
        attempt++;
        try {
          const result = await processSingleImage(target, (prog, step) => {
            setCurrentStepMessage(step);
            const itemPortion = (i / totalToProcess) * 100;
            const currentContribution = (prog / 100) * (100 / totalToProcess);
            setOverallProgress(Math.min(99, itemPortion + currentContribution));

            setItems((prev) =>
              prev.map((item) => (item.id === target.id ? { ...item, progress: prog } : item))
            );
          });

          isSuccess = true;
          setItems((prev) =>
            prev.map((item) =>
              item.id === target.id
                ? {
                    ...item,
                    status: 'success',
                    progress: 100,
                    resultBlob: result.blob,
                    resultUrl: result.url,
                    resultSize: result.size,
                    resultDimensions: result.dimensions,
                    resultFormat: result.format,
                    savedPercent: result.savedPercent,
                    targetAchieved: result.targetAchieved,
                    errorMessage: undefined,
                    errorCode: undefined,
                  }
                : item
            )
          );
        } catch (err: any) {
          const isMemError = err instanceof ImageProcessingError && err.isTransientMemoryError;
          if (isMemError && attempt === 1) {
            // Temporary memory issue: yield to browser for GC and retry once
            setCurrentStepMessage('Optimizing memory, retrying...');
            await new Promise((r) => setTimeout(r, 200));
            continue;
          }

          // Failed after retry or permanent error: mark as failed and CONTINUE with remaining queue!
          const errCode = err instanceof ImageProcessingError ? err.code : 'UNKNOWN_ERROR';
          let localizedErrorMessage =
            err?.message ||
            tr.errCompression;
          if (errCode === 'DECODE_ERROR') {
            localizedErrorMessage = tr.errDecode;
          } else if (errCode === 'MEMORY_ERROR') {
            localizedErrorMessage = tr.errMemory;
          } else if (errCode === 'UNSUPPORTED_FORMAT') {
            localizedErrorMessage = tr.errUnsupported;
          } else if (errCode === 'DIMENSION_ERROR') {
            localizedErrorMessage = tr.errDimension;
          } else if (errCode === 'COMPRESSION_ERROR') {
            localizedErrorMessage = tr.errCompression;
          }

          setItems((prev) =>
            prev.map((item) =>
              item.id === target.id
                ? {
                    ...item,
                    status: 'error',
                    progress: 0,
                    errorMessage: localizedErrorMessage,
                    errorCode: errCode,
                  }
                : item
            )
          );
          break;
        }
      }

      // Allow browser GC and GPU texture release between large images (Requirement 10)
      if (typeof (window as any).requestIdleCallback === 'function') {
        await new Promise((r) => (window as any).requestIdleCallback(r, { timeout: 80 }));
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    setOverallProgress(100);
    setIsProcessing(false);
  };

  const handleStartProcessing = () => {
    // Process all items that are not yet successfully completed
    const uncompleted = items.filter((i) => i.status !== 'success');
    runQueue(uncompleted.length > 0 ? uncompleted : items);
  };

  const handleRetryFailed = () => {
    const failedItems = items.filter((i) => i.status === 'error');
    if (failedItems.length > 0) {
      runQueue(failedItems);
    }
  };

  const handleClearCompleted = () => {
    setItems((prev) => {
      prev
        .filter((i) => i.status === 'success')
        .forEach((i) => {
          if (i.previewUrl && i.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(i.previewUrl);
          }
          if (i.resultUrl && i.resultUrl.startsWith('blob:')) {
            URL.revokeObjectURL(i.resultUrl);
          }
        });
      return prev.filter((i) => i.status !== 'success');
    });
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    setZipErrorMessage(null);
    try {
      await downloadAllAsZip(items, 'pajoeit-optimized-images.zip');
    } catch (err: any) {
      setZipErrorMessage(tr.zipTooLargeWarning || err?.message);
    } finally {
      setIsZipping(false);
    }
  };

  const handleAddMoreFilesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const valid = Array.from(e.target.files).filter(isSupportedImageFile);
      if (valid.length > 0) {
        onAddFiles(valid);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden file input for "Add More Files" buttons */}
      <input
        ref={addFileInputRef}
        type="file"
        multiple
        accept="image/*,.webp,.png,.jpg,.jpeg,.gif,.bmp,.avif"
        onChange={handleAddMoreFilesInput}
        className="hidden"
      />

      {/* Batch Limit 50 Warning Banner */}
      {batchLimitWarning && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-md animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold">{batchLimitWarning}</p>
          </div>
          {onDismissLimitWarning && (
            <button
              onClick={onDismissLimitWarning}
              className="rounded-lg p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {tr.selectedImagesCount(items.length)}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                ({items.length}/50)
              </span>
              {hasFinishedBatch && failedCount === 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {tr.done}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr.pipelineSub}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{showSettingsDrawer ? tr.hideSettings : tr.configureSettings}</span>
          </button>

          <button
            onClick={onClearAll}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/50 transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{tr.clearAll}</span>
          </button>
        </div>
      </div>

      {/* Visual Workflow Pipeline Banner */}
      <WorkflowBar settings={globalSettings} fileCount={items.length} lang={lang} />

      {/* Expandable Settings Panel */}
      {showSettingsDrawer && (
        <SettingsPanel
          settings={globalSettings}
          onChange={handleSettingsChange}
          onApplyToAll={handleApplyToAll}
          fileCount={items.length}
          lang={lang}
        />
      )}

      {/* Processing Animated Overlay */}
      {isProcessing && (
        <ProcessingOverlay
          currentIndex={currentProcessingIndex}
          totalCount={items.length}
          currentFileName={currentProcessingFile}
          stepMessage={currentStepMessage}
          overallProgress={overallProgress}
          lang={lang}
        />
      )}

      {/* Completed Results Panel (shown when batch completes, even if some failed) */}
      {hasFinishedBatch && (
        <ResultsPanel
          items={items}
          onDownloadZip={handleDownloadAllZip}
          onReset={onClearAll}
          onRetryFailed={failedCount > 0 ? handleRetryFailed : undefined}
          onClearCompleted={successCount > 0 ? handleClearCompleted : undefined}
          onAddMore={() => addFileInputRef.current?.click()}
          isZipping={isZipping}
          zipErrorMessage={zipErrorMessage}
          onDismissZipError={() => setZipErrorMessage(null)}
          lang={lang}
        />
      )}

      {/* File Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>{tr.selectedImagesCount(items.length).toUpperCase()}</span>
          <span>{tr.dimensions.toUpperCase()}</span>
        </div>

        <div className="space-y-2.5">
          {items.map((item) => (
            <FileCard
              key={item.id}
              item={item}
              onRemove={handleRemoveItem}
              onOpenCompare={(target) => setCompareItem(target)}
              lang={lang}
            />
          ))}
        </div>

        {/* Compact dropzone to add more files (capped at 50) */}
        {items.length < 50 && (
          <div className="pt-2">
            <Dropzone compact onFilesSelected={onAddFiles} lang={lang} />
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      {!hasFinishedBatch && (
        <div className="sticky bottom-4 z-30 rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>
              {tr.readyToProcess(items.length)}
            </span>
            <span className="text-slate-400 text-[11px]">
              • {tr.upTo50Images}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleStartProcessing}
              disabled={isProcessing}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 hover:shadow-cyan-500/40 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tr.processing}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{tr.processFiles(items.length)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Draggable Before / After Modal */}
      {compareItem && (
        <BeforeAfterModal
          item={compareItem}
          onClose={() => setCompareItem(null)}
          lang={lang}
        />
      )}
    </div>
  );
};

