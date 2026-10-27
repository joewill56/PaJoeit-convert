import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { OfflineIndicator } from './components/layout/OfflineIndicator';
import { Breadcrumbs } from './components/layout/Breadcrumbs';
import { Dropzone } from './components/upload/Dropzone';
import { FileWorkspace } from './components/workspace/FileWorkspace';
import { PopularToolsSection } from './components/content/PopularToolsSection';
import { WhyPajoeitSection } from './components/content/WhyPajoeitSection';
import { HowItWorksSection } from './components/content/HowItWorksSection';
import { PrivacySection } from './components/content/PrivacySection';
import { GuidesSection } from './components/content/GuidesSection';
import { ToolDetailContent } from './components/content/ToolDetailContent';
import { GuideDetailView } from './components/content/GuideDetailView';
import { GuidesListPageView } from './components/content/GuidesListPageView';
import { AboutPageView } from './components/content/AboutPageView';
import { ThemeProvider } from './components/ui/ThemeContext';
import {
  ImageProcessingSettings,
  ProcessedImageItem,
  ToolRouteConfig,
} from './types/image';
import { TOOLS_CONFIG, GUIDES_DATA } from './lib/seo/routes-data';
import {
  getImageDimensions,
  generateThumbnailUrl,
  createFallbackThumbnailSvg,
  isSupportedImageFile,
  prepareWorkspaceFile,
} from './lib/image-engine/file-utils';
import {
  LanguageCode,
  parsePath,
  SUPPORTED_LANGUAGES,
  resolveActiveLanguage,
  getUserLanguagePreference,
  saveUserLanguagePreference,
  saveAutoDetectedLanguage,
  detectBrowserLanguage,
  fetchVisitorCountryCode,
} from './lib/i18n/languages';
import { t } from './lib/i18n/translations';
import { getLocalizedTool } from './lib/i18n/translations/tools';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [userSelectedLang, setUserSelectedLang] = useState<LanguageCode | null>(null);
  const [savedUserLang, setSavedUserLang] = useState<LanguageCode | null>(() =>
    getUserLanguagePreference()
  );
  const [ipCountryCode, setIpCountryCode] = useState<string | null>(null);
  const [browserLang] = useState<LanguageCode | null>(() => detectBrowserLanguage());

  const [items, setItems] = useState<ProcessedImageItem[]>([]);
  const [batchLimitWarning, setBatchLimitWarning] = useState<string | null>(null);
  const [globalSettings, setGlobalSettings] = useState<ImageProcessingSettings>({
    outputFormat: 'original',
    quality: 0.75,
    compressionPreset: 'balanced',
    resizeEnabled: false,
    lockAspectRatio: true,
    targetSizeEnabled: false,
    targetSizeKB: 100,
  });

  // Parse path to extract explicit URL language and subPath
  const { subPath, hasExplicitLang } = parsePath(currentPath);

  // Resolve active language according to the 6-step priority hierarchy:
  // 1. Explicit URL language -> 2. User-selected language -> 3. Saved user preference
  // -> 4. IP-derived country -> 5. Browser language -> 6. English fallback
  const lang = resolveActiveLanguage({
    pathname: currentPath,
    userSelectedLang,
    savedUserLang,
    ipCountryCode,
    browserLang,
  });
  const tr = t(lang);

  // Fetch country-level code from Cloudflare Pages Function (/api/locale)
  useEffect(() => {
    let cancelled = false;
    fetchVisitorCountryCode().then((country) => {
      if (!cancelled && country) {
        setIpCountryCode(country);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Record automatically detected language separately in sessionStorage when no manual choice exists
  useEffect(() => {
    if (!hasExplicitLang && !userSelectedLang && !savedUserLang) {
      saveAutoDetectedLanguage(lang);
    }
  }, [lang, hasExplicitLang, userSelectedLang, savedUserLang]);

  const handleSelectLanguage = useCallback((selected: LanguageCode) => {
    setUserSelectedLang(selected);
    setSavedUserLang(selected);
    saveUserLanguagePreference(selected);
  }, []);

  // Synchronize document direction and lang
  useEffect(() => {
    const isRTL = lang === 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [lang]);

  // Route analysis
  const isAboutRoute = subPath === '/about';
  const isGuidesListRoute = subPath === '/guides';
  const isGuideDetailRoute = subPath.startsWith('/guides/') && subPath !== '/guides';
  const guideSlug = isGuideDetailRoute ? subPath.replace('/guides/', '') : null;
  const activeGuide = guideSlug ? GUIDES_DATA[guideSlug] : null;

  const toolSlug = subPath.replace(/^\//, '');
  const isDedicatedToolRoute = Boolean(toolSlug && TOOLS_CONFIG[toolSlug]);
  const activeTool: ToolRouteConfig = isDedicatedToolRoute
    ? TOOLS_CONFIG[toolSlug]
    : TOOLS_CONFIG['root'];

  const localizedToolContent = getLocalizedTool(activeTool.slug, lang);

  // Sync settings when tool route changes
  useEffect(() => {
    if (activeTool && activeTool.defaultSettings) {
      setGlobalSettings((prev) => ({
        ...prev,
        ...activeTool.defaultSettings,
      }));
    }
  }, [activeTool]);

  // Dynamic SEO Title, Meta Descriptions, Canonical, and Hreflang Tags
  useEffect(() => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://pajoeit-convert.pages.dev';

    let pageTitle = 'PAJOEIT CONVERT – Free Online Image Workspace';
    let metaDesc =
      'Convert, compress, and resize images directly in your browser. Fast, free, private image workspace with zero server uploads or signups.';

    if (isAboutRoute) {
      pageTitle = `About PAJOEIT CONVERT | Free Client-Side Image Workspace`;
      metaDesc =
        'Learn about PAJOEIT CONVERT, our browser-first image processing engine, privacy architecture, and the PAJOEIT brand ecosystem.';
    } else if (isGuidesListRoute) {
      pageTitle = `Image Optimization Guides & Tutorials | PAJOEIT CONVERT`;
      metaDesc =
        'Comprehensive tutorials on WebP conversion, reducing image sizes to 100KB, aspect ratios, and Core Web Vitals optimization.';
    } else if (activeGuide) {
      pageTitle = `${activeGuide.title} | PAJOEIT CONVERT`;
      metaDesc = activeGuide.metaDescription;
    } else if (isDedicatedToolRoute) {
      pageTitle = localizedToolContent.title;
      metaDesc = localizedToolContent.metaDescription;
    } else {
      pageTitle = localizedToolContent.title;
      metaDesc = localizedToolContent.metaDescription;
    }

    document.title = pageTitle;

    // Update meta description
    let metaDescriptionEl = document.querySelector('meta[name="description"]');
    if (!metaDescriptionEl) {
      metaDescriptionEl = document.createElement('meta');
      metaDescriptionEl.setAttribute('name', 'description');
      document.head.appendChild(metaDescriptionEl);
    }
    metaDescriptionEl.setAttribute('content', metaDesc);

    // Update OpenGraph
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', pageTitle);
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', metaDesc);
    const ogUrlEl = document.querySelector('meta[property="og:url"]');
    if (ogUrlEl) ogUrlEl.setAttribute('content', `${origin}${currentPath}`);

    // Update Twitter
    const twitterTitleEl = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitleEl) twitterTitleEl.setAttribute('content', pageTitle);
    const twitterDescEl = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescEl) twitterDescEl.setAttribute('content', metaDesc);

    // Dynamic Canonical Link
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', `${origin}${currentPath}`);

    // Dynamic Hreflang Tags for all 10 languages + x-default
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());

    // Clean subpath for alternate links
    const cleanSubPath = subPath === '/' ? '' : subPath;

    SUPPORTED_LANGUAGES.forEach((l) => {
      const link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', l.code);
      const localizedHref = l.code === 'en' ? `${origin}${cleanSubPath || '/'}` : `${origin}/${l.code}${cleanSubPath}`;
      link.setAttribute('href', localizedHref);
      document.head.appendChild(link);
    });

    const defaultLink = document.createElement('link');
    defaultLink.setAttribute('rel', 'alternate');
    defaultLink.setAttribute('hreflang', 'x-default');
    defaultLink.setAttribute('href', `${origin}${cleanSubPath || '/'}`);
    document.head.appendChild(defaultLink);

    // Handle hash scroll (e.g. /#privacy)
    if (window.location.hash === '#privacy') {
      setTimeout(() => {
        const el = document.getElementById('privacy');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [
    currentPath,
    lang,
    subPath,
    isAboutRoute,
    isGuidesListRoute,
    activeGuide,
    isDedicatedToolRoute,
    localizedToolContent,
  ]);

  // Handle client-side navigation
  const handleNavigate = useCallback((path: string) => {
    if (path.startsWith('/#')) {
      const hash = path.replace('/', '');
      window.location.hash = hash;
      const el = document.getElementById(hash.replace('#', ''));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Add files to workspace with strict 50 items cap
  const handleAddFiles = useCallback(
    async (files: File[]) => {
      const currentCount = items.length;
      if (currentCount >= 50) {
        setBatchLimitWarning(tr.limitExceededNotice(50, 0));
        return;
      }

      let filesToAdd = files;
      if (currentCount + files.length > 50) {
        const allowed = 50 - currentCount;
        filesToAdd = files.slice(0, allowed);
        setBatchLimitWarning(tr.limitExceededNotice(currentCount, allowed));
      } else {
        setBatchLimitWarning(null);
      }

      const newItems: ProcessedImageItem[] = [];

      // Strictly serialized file preparation:
      // prepareWorkspaceFile reads bytes once into a stable Blob (fixes Android content:// URI expiry),
      // detects true MIME from magic bytes, extracts dimensions from headers, generates thumbnail.
      for (let i = 0; i < filesToAdd.length; i++) {
        const file = filesToAdd[i];

        let safeFile: File = file;
        let dimensions = { width: 0, height: 0 };
        let detectedMime: string = file.type || 'image/jpeg';
        let previewUrl = '';

        try {
          const prepared = await prepareWorkspaceFile(file);
          safeFile = prepared.safeFile;
          dimensions = prepared.dimensions;
          detectedMime = prepared.detectedMime;
          previewUrl = prepared.previewUrl;
        } catch {
          // Fallback: try basic dimension + thumbnail separately
          try { dimensions = await getImageDimensions(file); } catch { dimensions = { width: 1920, height: 1080 }; }
          try { previewUrl = await generateThumbnailUrl(file, 160); } catch { previewUrl = createFallbackThumbnailSvg(file.name); }
        }

        if (!previewUrl) {
          previewUrl = createFallbackThumbnailSvg(safeFile.name);
        }

        newItems.push({
          id: `${safeFile.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file: safeFile,
          name: safeFile.name,
          originalSize: safeFile.size || file.size,
          originalDimensions: dimensions,
          originalFormat: detectedMime,
          previewUrl,
          settings: { ...globalSettings },
          status: 'idle',
          progress: 0,
        });

        // Yield between files to allow browser to reclaim resources
        if (typeof (window as any).requestIdleCallback === 'function') {
          await new Promise((r) => (window as any).requestIdleCallback(r, { timeout: 30 }));
        } else {
          await new Promise((r) => setTimeout(r, 10));
        }
      }

      setItems((prev) => [...prev, ...newItems]);
    },
    [items.length, globalSettings, tr]
  );

  // Global clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files: File[] = [];
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const f = e.clipboardData.files[i];
          if (isSupportedImageFile(f)) {
            files.push(f);
          }
        }
        if (files.length > 0) {
          e.preventDefault();
          handleAddFiles(files);
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleAddFiles]);

  // Clear all workspace items with full object URL revocation
  const handleClearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item.resultUrl && item.resultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.resultUrl);
      }
    });
    setItems([]);
    setBatchLimitWarning(null);
  }, [items]);

  // Generate a sample image for instant testing
  const handleLoadSample = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#4f46e5');
    grad.addColorStop(1, '#9333ea');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(400, 300, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(1500, 700, 360, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAJOEIT CONVERT SAMPLE', 960, 500);

    ctx.font = '36px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('1920 × 1080 • High Resolution Test Photo', 960, 580);

    canvas.toBlob(
      (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (blob) {
          const file = new File([blob], 'sample-mountain-landscape.jpg', {
            type: 'image/jpeg',
          });
          handleAddFiles([file]);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const homePath = lang === 'en' ? '/' : `/${lang}`;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        {/* Offline indicator */}
        <OfflineIndicator />

        {/* Global Navigation Header */}
        <Header
          currentPath={currentPath}
          lang={lang}
          onNavigate={handleNavigate}
          onSelectLanguage={handleSelectLanguage}
        />

        {/* Main Content Area */}
        <main className="flex-1">
          {/* ROUTE 1: ABOUT PAGE */}
          {isAboutRoute ? (
            <AboutPageView lang={lang} onNavigate={handleNavigate} />
          ) : /* ROUTE 2: GUIDES LIST PAGE */
          isGuidesListRoute ? (
            <GuidesListPageView lang={lang} onNavigate={handleNavigate} />
          ) : /* ROUTE 3: GUIDE DETAIL ARTICLE */
          isGuideDetailRoute && activeGuide ? (
            <GuideDetailView
              guide={activeGuide}
              lang={lang}
              onNavigate={handleNavigate}
            />
          ) : /* ROUTE 4: DEDICATED TOOL PAGE */
          isDedicatedToolRoute ? (
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {/* Dynamic Breadcrumbs */}
              <Breadcrumbs
                items={[
                  { label: tr.workspace, path: homePath },
                  { label: tr.tools, path: homePath },
                  { label: localizedToolContent.shortTitle, isCurrent: true },
                ]}
                lang={lang}
                onNavigate={handleNavigate}
              />

              {/* Tool Specific Hero */}
              <section className="text-center pt-2 pb-8 sm:pt-4 sm:pb-10 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 font-mono mb-4 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{localizedToolContent.tagline}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                  {localizedToolContent.h1}
                </h1>

                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                  {localizedToolContent.lead}
                </p>

                {/* Trust Badges */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustFree}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustNoSignup}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustPrivate}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustBrowser}
                  </span>
                </div>
              </section>

              {/* Tool-specific interactive workspace */}
              <section className="relative mx-auto max-w-5xl">
                {batchLimitWarning && items.length === 0 && (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-md animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm font-semibold">{batchLimitWarning}</p>
                    </div>
                    <button
                      onClick={() => setBatchLimitWarning(null)}
                      className="rounded-lg p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition"
                      aria-label="Dismiss warning"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="space-y-4">
                    <Dropzone
                      onFilesSelected={handleAddFiles}
                      acceptedFormatsText={
                        activeTool.slug === 'webp-to-png' ||
                        activeTool.slug === 'webp-to-jpg'
                          ? 'WEBP • JPG • PNG'
                          : activeTool.slug === 'png-to-jpg'
                          ? 'PNG • WEBP • JPG'
                          : 'JPG • PNG • WebP • GIF • AVIF'
                      }
                      lang={lang}
                    />

                    {/* Quick Sample Image Button */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{tr.noImageOnHand}</span>
                      <button
                        onClick={handleLoadSample}
                        className="font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 hover:decoration-cyan-400 transition"
                      >
                        {tr.trySample}
                      </button>
                    </div>
                  </div>
                ) : (
                  <FileWorkspace
                    items={items}
                    setItems={setItems}
                    globalSettings={globalSettings}
                    setGlobalSettings={setGlobalSettings}
                    onAddFiles={handleAddFiles}
                    onClearAll={handleClearAll}
                    lang={lang}
                    batchLimitWarning={batchLimitWarning}
                    onDismissLimitWarning={() => setBatchLimitWarning(null)}
                  />
                )}
              </section>

              {/* Dedicated Tool Content & Documentation */}
              <div className="mt-12 max-w-5xl mx-auto">
                <ToolDetailContent
                  tool={activeTool}
                  lang={lang}
                  onNavigate={handleNavigate}
                />
              </div>
            </div>
          ) : (
            /* ROUTE 5: HOMEPAGE (All-in-One Image Workspace) */
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {/* Hero Section */}
              <section className="text-center pt-4 pb-8 sm:pt-8 sm:pb-12 max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 font-mono mb-6 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tr.freeBadge}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                  {localizedToolContent.h1}
                </h1>

                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                  {localizedToolContent.lead}
                </p>

                {/* Trust Indicators */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustFree}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustNoSignup}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustPrivate}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[3]" /> {tr.trustBrowser}
                  </span>
                </div>
              </section>

              {/* PRIMARY INTERACTIVE IMAGE WORKSPACE */}
              <section className="relative mx-auto max-w-5xl">
                {batchLimitWarning && items.length === 0 && (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 backdrop-blur-md shadow-md animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm font-semibold">{batchLimitWarning}</p>
                    </div>
                    <button
                      onClick={() => setBatchLimitWarning(null)}
                      className="rounded-lg p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition"
                      aria-label="Dismiss warning"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="space-y-4">
                    <Dropzone
                      onFilesSelected={handleAddFiles}
                      acceptedFormatsText="JPG • PNG • WebP • GIF • AVIF"
                      lang={lang}
                    />

                    {/* Quick Sample Image Button */}
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{tr.noImageOnHand}</span>
                      <button
                        onClick={handleLoadSample}
                        className="font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 hover:decoration-cyan-400 transition"
                      >
                        {tr.trySample}
                      </button>
                    </div>
                  </div>
                ) : (
                  <FileWorkspace
                    items={items}
                    setItems={setItems}
                    globalSettings={globalSettings}
                    setGlobalSettings={setGlobalSettings}
                    onAddFiles={handleAddFiles}
                    onClearAll={handleClearAll}
                    lang={lang}
                    batchLimitWarning={batchLimitWarning}
                    onDismissLimitWarning={() => setBatchLimitWarning(null)}
                  />
                )}
              </section>

              {/* Popular Tools Showcase */}
              <div className="mt-12 max-w-5xl mx-auto">
                <PopularToolsSection lang={lang} onNavigate={handleNavigate} />
              </div>

              {/* Why PAJOEIT Section */}
              <div className="max-w-5xl mx-auto">
                <WhyPajoeitSection lang={lang} />
              </div>

              {/* How It Works Section */}
              <div className="max-w-5xl mx-auto">
                <HowItWorksSection lang={lang} />
              </div>

              {/* Educational Guides Section */}
              <div className="max-w-5xl mx-auto">
                <GuidesSection lang={lang} onNavigate={handleNavigate} />
              </div>

              {/* Privacy Deep Dive Section */}
              <div className="max-w-5xl mx-auto">
                <PrivacySection lang={lang} />
              </div>
            </div>
          )}
        </main>

        {/* Global Footer */}
        <Footer lang={lang} onNavigate={handleNavigate} />
      </div>
    </ThemeProvider>
  );
}
