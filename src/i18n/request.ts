import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
 
export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!['en', 'bn'].includes(locale as string)) notFound();
 
  return {
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
