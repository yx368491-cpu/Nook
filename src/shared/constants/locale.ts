export const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  'zh-CN': '中文',
  en: 'English',
};
