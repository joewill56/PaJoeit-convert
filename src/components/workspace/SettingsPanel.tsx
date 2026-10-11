import React, { useState } from 'react';
import {
  Sliders,
  Maximize2,
  Lock,
  Unlock,
  Check,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  CompressionPreset,
  ImageProcessingSettings,
  SmartPreset,
  SupportedFormat,
} from '../../types/image';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';

interface SettingsPanelProps {
  settings: ImageProcessingSettings;
  onChange: (updated: ImageProcessingSettings) => void;
  onApplyToAll: () => void;
  fileCount: number;
  lang?: LanguageCode;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onApplyToAll,
  fileCount,
  lang = 'en',
}) => {
  const [activePreset, setActivePreset] = useState<SmartPreset>('custom');
  const tr = t(lang);

  const updateSetting = <K extends keyof ImageProcessingSettings>(
    key: K,
    val: ImageProcessingSettings[K]
  ) => {
    setActivePreset('custom');
    onChange({ ...settings, [key]: val });
  };

  const handleSmartPresetChange = (preset: SmartPreset) => {
    setActivePreset(preset);
    if (preset === 'website') {
      onChange({
        ...settings,
        outputFormat: 'image/webp',
        compressionPreset: 'balanced',
        quality: 0.80,
        resizeEnabled: true,
        resizeWidth: 1600,
        lockAspectRatio: true,
        targetSizeEnabled: false,
      });
    } else if (preset === 'social-media') {
      onChange({
        ...settings,
        outputFormat: 'image/jpeg',
        compressionPreset: 'balanced',
        quality: 0.85,
        resizeEnabled: true,
        resizeWidth: 1080,
        lockAspectRatio: true,
        targetSizeEnabled: false,
      });
    } else if (preset === 'messaging') {
      onChange({
        ...settings,
        outputFormat: 'image/jpeg',
        compressionPreset: 'balanced',
        quality: 0.75,
        resizeEnabled: true,
        resizeWidth: 800,
        lockAspectRatio: true,
        targetSizeEnabled: false,
      });
    } else if (preset === 'email') {
      onChange({
        ...settings,
        outputFormat: 'image/jpeg',
        compressionPreset: 'balanced',
        quality: 0.75,
        resizeEnabled: true,
        resizeWidth: 600,
        lockAspectRatio: true,
        targetSizeEnabled: true,
        targetSizeKB: 200,
      });
    } else if (preset === 'app-upload') {
      onChange({
        ...settings,
        outputFormat: 'image/jpeg',
        compressionPreset: 'custom',
        quality: 0.70,
        resizeEnabled: false,
        lockAspectRatio: true,
        targetSizeEnabled: true,
        targetSizeKB: 100,
      });
    } else if (preset === 'max-compression') {
      onChange({
        ...settings,
        outputFormat: 'image/webp',
        compressionPreset: 'max',
        quality: 0.50,
        resizeEnabled: false,
        lockAspectRatio: true,
        targetSizeEnabled: false,
      });
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Header & Smart Presets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tr.pipelineTitle}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.pipelineSub}</p>
          </div>
        </div>

        {/* Smart Presets Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> {tr.presets}:
          </span>
          <select
            value={activePreset}
            onChange={(e) => handleSmartPresetChange(e.target.value as SmartPreset)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="custom">{tr.customConfig}</option>
            <option value="website">Website (WebP • 1600px)</option>
            <option value="social-media">Social Media (JPG • 1080px)</option>
            <option value="messaging">Messaging & Chat (800px)</option>
            <option value="email">Email Friendly (&lt;200KB)</option>
            <option value="app-upload">Online Portal / ID (100KB Limit)</option>
            <option value="max-compression">Maximum Space Saving</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Output Format */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between">
            <span>1. {tr.outputFormat}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'original', label: tr.original },
              { id: 'image/jpeg', label: 'JPG' },
              { id: 'image/png', label: 'PNG' },
              { id: 'image/webp', label: 'WebP' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updateSetting('outputFormat', f.id as SupportedFormat)}
                className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition ${
                  settings.outputFormat === f.id
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            {settings.outputFormat === 'image/webp'
              ? 'Modern web standard: 30% smaller than JPG.'
              : settings.outputFormat === 'image/png'
              ? 'Lossless compression with alpha transparency.'
              : settings.outputFormat === 'image/jpeg'
              ? 'Universal photo compatibility on all systems.'
              : 'Preserves existing file container type.'}
          </p>
        </div>

        {/* 2. Compression & Quality */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
              2. {tr.compression}
            </label>
            <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
              {Math.round(settings.quality * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'balanced', label: 'Balanced', val: 0.75 },
              { id: 'light', label: 'Light', val: 0.88 },
              { id: 'max', label: 'Max', val: 0.50 },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePreset('custom');
                  onChange({
                    ...settings,
                    compressionPreset: p.id as CompressionPreset,
                    quality: p.val,
                  });
                }}
                className={`rounded-xl border py-1.5 text-center text-xs font-medium transition ${
                  settings.compressionPreset === p.id
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quality Slider */}
          <div className="space-y-1 pt-1">
            <input
              type="range"
              min="0.10"
              max="1.0"
              step="0.01"
              value={settings.quality ?? 0.75}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                const newQuality = isNaN(parsed) ? 0.75 : Math.round(parsed * 100) / 100;
                setActivePreset('custom');
                onChange({
                  ...settings,
                  quality: newQuality,
                  compressionPreset: 'custom',
                });
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Small Size</span>
              <span>High Quality</span>
            </div>
          </div>
        </div>

        {/* 3. Resize Dimensions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-500" />
              <span>3. {tr.dimensions}</span>
            </label>
            <button
              type="button"
              onClick={() => updateSetting('resizeEnabled', !settings.resizeEnabled)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold transition ${
                settings.resizeEnabled
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {settings.resizeEnabled ? tr.active : tr.off}
            </button>
          </div>

          <div className={`space-y-2 ${!settings.resizeEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-mono">{tr.widthPx}</span>
                <input
                  type="number"
                  placeholder="Auto"
                  value={settings.resizeWidth || ''}
                  onChange={(e) =>
                    updateSetting('resizeWidth', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-mono">{tr.heightPx}</span>
                <input
                  type="number"
                  placeholder="Auto"
                  value={settings.resizeHeight || ''}
                  onChange={(e) =>
                    updateSetting('resizeHeight', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateSetting('lockAspectRatio', !settings.lockAspectRatio)}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
            >
              {settings.lockAspectRatio ? (
                <>
                  <Lock className="w-3 h-3 text-cyan-500" />
                  <span>{tr.lockAspectRatio}</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-amber-500" />
                  <span>{tr.lockAspectRatio}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. Target Size Engine */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>4. {tr.targetSize}</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setActivePreset('custom');
                onChange({
                  ...settings,
                  targetSizeEnabled: !settings.targetSizeEnabled,
                  targetSizeKB: settings.targetSizeKB || 100,
                });
              }}
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold transition ${
                settings.targetSizeEnabled
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {settings.targetSizeEnabled ? tr.active : tr.off}
            </button>
          </div>

          <div className={`space-y-2.5 ${!settings.targetSizeEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-1.5">
              {[50, 100, 200, 500].map((kb) => (
                <button
                  key={kb}
                  type="button"
                  onClick={() => {
                    setActivePreset('custom');
                    onChange({
                      ...settings,
                      targetSizeEnabled: true,
                      targetSizeKB: kb,
                    });
                  }}
                  className={`flex-1 rounded-xl border py-1.5 text-center text-xs font-mono font-semibold transition ${
                    settings.targetSizeKB === kb
                      ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {kb}KB
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">{tr.customKb}</span>
              <input
                type="number"
                min="10"
                max="5000"
                value={settings.targetSizeKB || 100}
                onChange={(e) => updateSetting('targetSizeKB', parseInt(e.target.value) || 100)}
                className="w-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 text-xs text-slate-900 dark:text-white font-mono text-center focus:border-amber-500 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Adaptive binary search algorithm tunes quality and steps down resolution if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer bar of Settings */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/80 pt-4 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {tr.applyToAllDesc(fileCount)}
        </span>
        <button
          type="button"
          onClick={onApplyToAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{tr.applyToAll} ({fileCount})</span>
        </button>
      </div>
    </div>
  );
};
