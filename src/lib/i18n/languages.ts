export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'pt'
  | 'de'
  | 'ar'
  | 'hi'
  | 'id'
  | 'zh'
  | 'ja';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  isRTL?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRTL: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const USER_LANG_STORAGE_KEY = 'pajoeit_user_lang';
export const AUTO_LANG_STORAGE_KEY = 'pajoeit_auto_lang';

export function isLanguageCode(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/**
 * Matches a single BCP-47 / browser language tag (e.g. "fr-FR", "es-ES", "pt-BR",
 * "zh-CN", "ja-JP", "hi-IN", "id-ID", "ar-SA", "de-AT", "in-ID") to a supported LanguageCode.
 */
export function matchBrowserLanguageTag(tag: string | null | undefined): LanguageCode | null {
  if (!tag || typeof tag !== 'string') return null;
  const normalized = tag.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return null;

  // Direct exact match
  if (isLanguageCode(normalized)) {
    return normalized;
  }

  // Primary subtag extraction (e.g. "fr-fr" -> "fr", "pt-br" -> "pt", "zh-cn" -> "zh")
  const primary = normalized.split('-')[0];
  if (primary === 'in') {
    // Legacy ISO code for Indonesian ("in" / "in-ID")
    return 'id';
  }
  if (isLanguageCode(primary)) {
    return primary;
  }

  return null;
}

/**
 * Inspects navigator.languages and navigator.language in preference order
 * and returns the first supported LanguageCode, or null if none match.
 */
export function detectBrowserLanguage(
  languagesList?: readonly string[],
  singleLanguage?: string
): LanguageCode | null {
  const candidates: string[] = [];

  if (Array.isArray(languagesList) && languagesList.length > 0) {
    candidates.push(...languagesList);
  } else if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }
  }

  if (singleLanguage) {
    candidates.push(singleLanguage);
  }

  for (const tag of candidates) {
    const matched = matchBrowserLanguageTag(tag);
    if (matched) {
      return matched;
    }
  }

  return null;
}

/**
 * Country-to-Language mapping for IP-derived country codes (ISO 3166-1 alpha-2).
 * Only maps to the 10 supported languages.
 * For multilingual countries, considers the visitor's browser language preference if applicable.
 */
const COUNTRY_TO_LANGUAGE_MAP: Record<string, LanguageCode> = {
  // French
  FR: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  ML: 'fr',
  BF: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  GN: 'fr',
  GA: 'fr',
  CG: 'fr',
  CD: 'fr',
  MG: 'fr',
  HT: 'fr',

  // Spanish
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  PR: 'es',
  GQ: 'es',

  // German
  DE: 'de',
  AT: 'de',
  LI: 'de',

  // Portuguese
  PT: 'pt',
  BR: 'pt',
  AO: 'pt',
  MZ: 'pt',
  CV: 'pt',
  GW: 'pt',
  ST: 'pt',
  TL: 'pt',

  // Chinese
  CN: 'zh',
  TW: 'zh',
  MO: 'zh',

  // Japanese
  JP: 'ja',

  // Hindi
  IN: 'hi',

  // Indonesian
  ID: 'id',

  // Arabic
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  DZ: 'ar',
  MA: 'ar',
  IQ: 'ar',
  SD: 'ar',
  YE: 'ar',
  SY: 'ar',
  TN: 'ar',
  JO: 'ar',
  LY: 'ar',
  LB: 'ar',
  KW: 'ar',
  OM: 'ar',
  QA: 'ar',
  BH: 'ar',
  PS: 'ar',
  MR: 'ar',

  // English (including Nigeria -> English as sensible default)
  NG: 'en',
  US: 'en',
  GB: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  GH: 'en',
  KE: 'en',
  ZA: 'en',
  UG: 'en',
  TZ: 'en',
  ZW: 'en',
  ZM: 'en',
  RW: 'en',
  PH: 'en',
  JM: 'en',
  TT: 'en',
};

const MULTILINGUAL_COUNTRIES: Record<
  string,
  { allowed: LanguageCode[]; defaultLang: LanguageCode }
> = {
  CH: { allowed: ['de', 'fr'], defaultLang: 'de' },
  BE: { allowed: ['fr', 'de'], defaultLang: 'fr' },
  LU: { allowed: ['fr', 'de'], defaultLang: 'fr' },
  CA: { allowed: ['en', 'fr'], defaultLang: 'en' },
  CM: { allowed: ['fr', 'en'], defaultLang: 'fr' },
  HK: { allowed: ['zh', 'en'], defaultLang: 'zh' },
  SG: { allowed: ['en', 'zh', 'id', 'hi'], defaultLang: 'en' },
};

export function mapCountryToLanguage(
  countryCode: string | null | undefined,
  browserLang?: LanguageCode | null
): LanguageCode | null {
  if (!countryCode || typeof countryCode !== 'string') return null;
  const code = countryCode.trim().toUpperCase();
  if (code.length !== 2) return null;

  // Check multilingual country rules first
  const multi = MULTILINGUAL_COUNTRIES[code];
  if (multi) {
    if (browserLang && multi.allowed.includes(browserLang)) {
      return browserLang;
    }
    return multi.defaultLang;
  }

  // Check direct country mapping
  return COUNTRY_TO_LANGUAGE_MAP[code] || null;
}

/**
 * Reads the user's explicitly saved language preference from localStorage.
 * Kept strictly separate from automatic IP/browser detection.
 */
export function getUserLanguagePreference(): LanguageCode | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(USER_LANG_STORAGE_KEY);
    if (saved && isLanguageCode(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors in private/restricted browsing modes
  }
  return null;
}

/**
 * Saves an explicit manual language choice made by the user.
 */
export function saveUserLanguagePreference(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(USER_LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Saves the automatically detected language in sessionStorage for diagnostics
 * without polluting the user's manual preference in localStorage.
 */
export function saveAutoDetectedLanguage(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(AUTO_LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Extracts the language code, remaining subPath, and whether the URL
 * explicitly requested a language prefix (e.g. "/es/webp-to-png", "/fr", "/ja", or "?lang=de").
 */
export function parsePath(
  pathname: string,
  search?: string
): { lang: LanguageCode; subPath: string; hasExplicitLang: boolean } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);

  if (parts.length > 0 && isLanguageCode(parts[0])) {
    const lang = parts[0] as LanguageCode;
    const remaining = '/' + parts.slice(1).join('/');
    return {
      lang,
      subPath: remaining === '/' || remaining === '' ? '/' : remaining,
      hasExplicitLang: true,
    };
  }

  // Check optional explicit query parameter (?lang=xx)
  const queryStr =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
  if (queryStr) {
    try {
      const params = new URLSearchParams(queryStr);
      const queryLang = params.get('lang');
      if (queryLang && isLanguageCode(queryLang.toLowerCase())) {
        return {
          lang: queryLang.toLowerCase() as LanguageCode,
          subPath: clean,
          hasExplicitLang: true,
        };
      }
    } catch {
      // Ignore malformed query string
    }
  }

  return {
    lang: DEFAULT_LANGUAGE,
    subPath: clean,
    hasExplicitLang: false,
  };
}

/**
 * Resolves language using the strict 6-step priority order:
 * 1. Explicit language in the current URL
 * 2. Explicit language selected by the user in session
 * 3. Previously saved manual user language preference
 * 4. IP-derived country as an automatic language fallback
 * 5. Supported browser language preference
 * 6. English ('en') as final fallback
 */
export function resolveActiveLanguage(options: {
  pathname: string;
  search?: string;
  userSelectedLang?: LanguageCode | null;
  savedUserLang?: LanguageCode | null;
  ipCountryCode?: string | null;
  browserLang?: LanguageCode | null;
}): LanguageCode {
  const parsed = parsePath(options.pathname, options.search);

  // 1. Explicit language in the current URL always wins
  if (parsed.hasExplicitLang) {
    return parsed.lang;
  }

  // 2. Explicit language selected by the user in current session
  if (options.userSelectedLang && isLanguageCode(options.userSelectedLang)) {
    return options.userSelectedLang;
  }

  // 3. Previously saved manual user language preference
  if (options.savedUserLang && isLanguageCode(options.savedUserLang)) {
    return options.savedUserLang;
  }

  // 4. IP-derived country as an automatic language fallback
  const mappedCountryLang = mapCountryToLanguage(
    options.ipCountryCode,
    options.browserLang
  );
  if (mappedCountryLang) {
    return mappedCountryLang;
  }

  // 5. Supported browser language preference
  if (options.browserLang && isLanguageCode(options.browserLang)) {
    return options.browserLang;
  }

  // 6. English as final fallback
  return DEFAULT_LANGUAGE;
}

/**
 * Queries the same-origin Cloudflare Pages Function (/api/locale) for country-level code.
 * Never exposes or stores IP addresses. Gracefully returns null if offline or unavailable.
 */
export async function fetchVisitorCountryCode(): Promise<string | null> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return null;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;

  try {
    const response = await fetch('/api/locale', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    const data = await response.json();
    if (data && typeof data.country === 'string' && /^[A-Z]{2}$/i.test(data.country.trim())) {
      return data.country.trim().toUpperCase();
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Builds a localized path preserving the page
 * Examples:
 *  buildLocalizedPath('/webp-to-png', 'es') -> '/es/webp-to-png'
 *  buildLocalizedPath('/', 'fr') -> '/fr'
 *  buildLocalizedPath('/es/guides', 'de') -> '/de/guides'
 */
export function buildLocalizedPath(currentSubPath: string, targetLang: LanguageCode): string {
  const { subPath } = parsePath(currentSubPath);
  if (targetLang === DEFAULT_LANGUAGE) {
    return subPath === '/' ? '/' : subPath;
  }
  return subPath === '/' ? `/${targetLang}` : `/${targetLang}${subPath}`;
}

