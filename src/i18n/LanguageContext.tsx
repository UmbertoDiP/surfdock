import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { SupportedLanguage } from './config';
import { SUPPORTED_LANGUAGES, isRTL } from './config';
import { getTranslation } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string>) => string;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'surfdock-lang';

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) return stored as SupportedLanguage;
  const browser = navigator.language.slice(0, 2);
  if (SUPPORTED_LANGUAGES.some(l => l.code === browser)) return browser as SupportedLanguage;
  return 'it';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => detectLanguage());

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    return getTranslation(language, key, params);
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language, setLanguage, t,
      availableLanguages: SUPPORTED_LANGUAGES,
      isRTL: isRTL(language),
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
