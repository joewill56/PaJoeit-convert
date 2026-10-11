import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Menu,
  X,
  ExternalLink,
  BookOpen,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../ui/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LanguageCode } from '../../lib/i18n/languages';
import { t } from '../../lib/i18n/translations';
import { getLocalizedTool } from '../../lib/i18n/translations/tools';
import { Logo } from '../brand/Logo';

interface HeaderProps {
  currentPath: string;
  lang: LanguageCode;
  onNavigate: (path: string) => void;
  onSelectLanguage?: (lang: LanguageCode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  lang,
  onNavigate,
  onSelectLanguage,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  const tr = t(lang);

  const homePath = lang === 'en' ? '/' : `/${lang}`;
  const guidesPath = lang === 'en' ? '/guides' : `/${lang}/guides`;
  const aboutPath = lang === 'en' ? '/about' : `/${lang}/about`;

  const popularTools = [
    'webp-to-png',
    'webp-to-jpg',
    'png-to-jpg',
    'jpg-to-png',
    'image-compressor',
    'image-resizer',
    'compress-jpg-to-100kb',
  ].map((slug) => ({
    slug,
    name: getLocalizedTool(slug, lang).shortTitle,
  }));

  const getToolPath = (slug: string) => {
    return lang === 'en' ? `/${slug}` : `/${lang}/${slug}`;
  };

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
  };

  const isToolActive = (slug: string) => {
    const target = getToolPath(slug);
    return currentPath === target || currentPath === `/${slug}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-xl transition-colors duration-200 shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => handleNav(homePath)}
            className="group flex items-center text-left focus:outline-none"
            aria-label="PAJOEIT CONVERT Home"
          >
            <Logo />
          </button>

          {/* Desktop Main Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 pl-2">
            {/* Tools Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  toolsDropdownOpen || (currentPath !== homePath && !currentPath.includes('/guides') && !currentPath.includes('/about'))
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tr.tools}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    toolsDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {toolsDropdownOpen && (
                <div
                  className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setToolsDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Image Utilities
                  </div>
                  {popularTools.map((t) => {
                    const toolPath = getToolPath(t.slug);
                    const active = isToolActive(t.slug);

                    return (
                      <button
                        key={t.slug}
                        onClick={() => handleNav(toolPath)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                          active
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        <span>{t.name}</span>
                        {active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => handleNav(homePath)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                currentPath === homePath || currentPath === '/'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tr.workspace}
            </button>

            <button
              onClick={() => handleNav(guidesPath)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                currentPath.includes('/guides')
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{tr.guides}</span>
            </button>

            <button
              onClick={() => handleNav(aboutPath)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                currentPath.includes('/about')
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{tr.about}</span>
            </button>
          </nav>
        </div>

        {/* Right Controls: Ecosystem Pill + Language + PWA + Theme Toggle + Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Ecosystem Pill for Brand family */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-1 px-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">PAJOEIT:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">CONVERT</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="https://wise.pajoeit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
              title="PAJOEIT WISE (AI Research & Knowledge)"
            >
              <span>WISE</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="https://dev.pajoeit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
              title="PAJOEIT DEV (Developer Tools)"
            >
              <span>DEV</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher
            currentLang={lang}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onSelectLanguage={onSelectLanguage}
          />

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Theme Toggle (Sun/Moon) */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition focus:outline-none shadow-xs"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 md:hidden items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-950/98 px-4 pt-3 pb-6 backdrop-blur-2xl animate-in slide-in-from-top duration-200 shadow-xl">
          <div className="space-y-1 mb-4">
            <button
              onClick={() => handleNav(homePath)}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                currentPath === homePath || currentPath === '/'
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <span>{tr.workspace}</span>
            </button>

            <div className="pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3.5">
              {tr.tools}
            </div>
            <div className="grid grid-cols-2 gap-1.5 px-1">
              {popularTools.map((t) => {
                const toolPath = getToolPath(t.slug);
                const active = isToolActive(t.slug);

                return (
                  <button
                    key={t.slug}
                    onClick={() => handleNav(toolPath)}
                    className={`rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold'
                        : 'bg-slate-100/70 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3.5">
              Resources
            </div>
            <button
              onClick={() => handleNav(guidesPath)}
              className={`flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                currentPath.includes('/guides')
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{tr.guides}</span>
            </button>
            <button
              onClick={() => handleNav(aboutPath)}
              className={`flex w-full items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                currentPath.includes('/about')
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{tr.about}</span>
            </button>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>PAJOEIT Family:</span>
            <div className="flex gap-3">
              <a href="https://wise.pajoeit.com" target="_blank" rel="noreferrer" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                WISE ↗
              </a>
              <a href="https://dev.pajoeit.com" target="_blank" rel="noreferrer" className="hover:text-cyan-600 dark:hover:text-cyan-400">
                DEV ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
