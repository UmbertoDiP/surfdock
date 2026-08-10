import type { TranslationKeys } from './types';
import type { SupportedLanguage } from './config';
import { it } from './locales/it';
import { en } from './locales/en';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { nl } from './locales/nl';
import { pl } from './locales/pl';
import { sv } from './locales/sv';
import { no } from './locales/no';
import { da } from './locales/da';
import { fi } from './locales/fi';
import { cs } from './locales/cs';
import { el } from './locales/el';
import { ro } from './locales/ro';
import { hu } from './locales/hu';
import { bg } from './locales/bg';
import { hr } from './locales/hr';
import { sk } from './locales/sk';
import { sr } from './locales/sr';
import { lt } from './locales/lt';
import { lv } from './locales/lv';
import { et } from './locales/et';
import { sl } from './locales/sl';
import { uk } from './locales/uk';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { hi } from './locales/hi';
import { th } from './locales/th';
import { vi } from './locales/vi';
import { id } from './locales/id';
import { ar } from './locales/ar';
import { he } from './locales/he';
import { tr } from './locales/tr';
import { ru } from './locales/ru';

const translations: Record<SupportedLanguage, Partial<TranslationKeys>> = {
  it, en, de, fr, es, pt, nl, pl, sv, no, da, fi, cs, el, ro, hu, bg, hr, sk, sr, lt, lv, et, sl, uk,
  zh, ja, ko, hi, th, vi, id, ar, he, tr, ru,
};

export function getTranslation(lang: SupportedLanguage, key: string, params?: Record<string, string>): string {
  const d = translations[lang] as Record<string, string> | undefined;
  const enDict = translations['en'] as Record<string, string>;
  const itDict = translations['it'] as Record<string, string>;
  let v: string | undefined = d?.[key] ?? enDict?.[key] ?? itDict?.[key];
  if (!v) return key;
  if (params) {
    for (const [p, r] of Object.entries(params)) {
      v = v.replace(`$${p}`, r);
    }
  }
  return v;
}

export { translations };