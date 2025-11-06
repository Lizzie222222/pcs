import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "./i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  return doc.body.textContent || '';
}

export function formatSafeDate(date: Date | string | null | undefined, locale?: string): string {
  if (!date) {
    return i18n.t('common:invalid_date');
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return i18n.t('common:invalid_date');
    }
    
    return dateObj.toLocaleDateString(locale);
  } catch (error) {
    return i18n.t('common:invalid_date');
  }
}

export function isChrome(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /chrome|chromium|crios/.test(userAgent) && !/edg/.test(userAgent);
}
