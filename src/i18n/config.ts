
export const SUPPORTED_LANGUAGES = [
  { code: 'it', name: 'Italiano', tier: 1, rtl: false },
  { code: 'en', name: 'English', tier: 1, rtl: false },
  { code: 'de', name: 'Deutsch', tier: 2, rtl: false },
  { code: 'fr', name: 'Français', tier: 2, rtl: false },
  { code: 'es', name: 'Español', tier: 2, rtl: false },
  { code: 'pt', name: 'Português', tier: 2, rtl: false },
  { code: 'nl', name: 'Nederlands', tier: 2, rtl: false },
  { code: 'pl', name: 'Polski', tier: 2, rtl: false },
  { code: 'sv', name: 'Svenska', tier: 2, rtl: false },
  { code: 'no', name: 'Norsk', tier: 2, rtl: false },
  { code: 'da', name: 'Dansk', tier: 2, rtl: false },
  { code: 'fi', name: 'Suomi', tier: 2, rtl: false },
  { code: 'cs', name: 'Čeština', tier: 2, rtl: false },
  { code: 'el', name: 'Ελληνικά', tier: 2, rtl: false },
  { code: 'ro', name: 'Română', tier: 2, rtl: false },
  { code: 'hu', name: 'Magyar', tier: 2, rtl: false },
  { code: 'bg', name: 'Български', tier: 2, rtl: false },
  { code: 'hr', name: 'Hrvatski', tier: 2, rtl: false },
  { code: 'sk', name: 'Slovenčina', tier: 2, rtl: false },
  { code: 'sr', name: 'Српски', tier: 2, rtl: false },
  { code: 'lt', name: 'Lietuvių', tier: 2, rtl: false },
  { code: 'lv', name: 'Latviešu', tier: 2, rtl: false },
  { code: 'et', name: 'Eesti', tier: 2, rtl: false },
  { code: 'sl', name: 'Slovenščina', tier: 2, rtl: false },
  { code: 'uk', name: 'Українська', tier: 2, rtl: false },
  { code: 'zh', name: '中文', tier: 3, rtl: false },
  { code: 'ja', name: '日本語', tier: 3, rtl: false },
  { code: 'ko', name: '한국어', tier: 3, rtl: false },
  { code: 'hi', name: 'हिन्दी', tier: 3, rtl: false },
  { code: 'th', name: 'ไทย', tier: 3, rtl: false },
  { code: 'vi', name: 'Tiếng Việt', tier: 3, rtl: false },
  { code: 'id', name: 'Bahasa Indonesia', tier: 3, rtl: false },
  { code: 'ar', name: 'العربية', tier: 4, rtl: true },
  { code: 'he', name: 'עברית', tier: 4, rtl: true },
  { code: 'tr', name: 'Türkçe', tier: 4, rtl: false },
  { code: 'ru', name: 'Русский', tier: 5, rtl: false },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const LANG_MAP: Record<SupportedLanguage, typeof SUPPORTED_LANGUAGES[number]> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map(l => [l.code, l])
) as any;

export function isRTL(lang: SupportedLanguage): boolean {
  return LANG_MAP[lang]?.rtl ?? false;
}
