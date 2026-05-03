import { getRequestConfig } from 'next-intl/server';
import { en, ar } from '@cup-and-co/i18n';

export default getRequestConfig(async ({ locale }) => {
  const messages = locale === 'ar' ? ar : en;
  return {
    locale: locale ?? 'en',
    messages: messages as unknown as Record<string, unknown>,
  };
});
