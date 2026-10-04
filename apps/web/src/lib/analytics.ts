/**
 * Google Analytics 4 (GA4) & Core Web Vitals Tracking Module
 * 
 * Designed for zero-latency, privacy compliance (Zero-PII, RAM-only meeting policy),
 * and non-blocking performance.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface WebVitalMetric {
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

let isInitialized = false;

export const DEFAULT_GA_MEASUREMENT_ID = 'G-81BYTQEBXR';

/**
 * Get Google Analytics Measurement ID from environment or default
 */
export function getMeasurementId(): string {
  return (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || DEFAULT_GA_MEASUREMENT_ID;
}

export const COOKIE_CONSENT_KEY = 'layameet_cookie_consent';

export type CookieConsentStatus = 'granted' | 'denied';

/**
 * Get stored Cookie consent status
 */
export function getStoredCookieConsent(): CookieConsentStatus | null {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(COOKIE_CONSENT_KEY) as CookieConsentStatus) || null;
}

/**
 * Update Google Analytics 4 Consent Mode v2
 */
export function updateAnalyticsConsent(status: CookieConsentStatus): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COOKIE_CONSENT_KEY, status);

  if (window.gtag) {
    window.gtag('consent', 'update', {
      analytics_storage: status,
      ad_storage: status,
      ad_user_data: status,
      ad_personalization: status,
    });
  }
}

/**
 * Initialize Google Analytics 4 asynchronously without blocking page render
 */
export function initAnalytics(): void {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  const measurementId = getMeasurementId();
  const consent = getStoredCookieConsent();

  // If window.gtag is not already loaded by index.html, inject it
  if (!window.gtag && measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };

    // Google Consent Mode v2 default
    window.gtag('consent', 'default', {
      analytics_storage: consent === 'granted' ? 'granted' : 'denied',
      ad_storage: consent === 'granted' ? 'granted' : 'denied',
      ad_user_data: consent === 'granted' ? 'granted' : 'denied',
      ad_personalization: consent === 'granted' ? 'granted' : 'denied',
    });

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false, // Handle page views explicitly via React Router
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  } else if (window.gtag && consent) {
    // Sync current stored consent
    window.gtag('consent', 'update', {
      analytics_storage: consent,
      ad_storage: consent,
      ad_user_data: consent,
      ad_personalization: consent,
    });
  }

  initPerformanceObservers();
  isInitialized = true;
}

/**
 * Track Page Views (SPA-friendly)
 */
export function trackPageView(path = window.location.pathname, title = document.title): void {
  const measurementId = getMeasurementId();
  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.debug('[Analytics Mock] PageView:', { path, title });
    }
    return;
  }

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: window.location.origin + path,
    });
  }
}

/**
 * Track Custom Business Events
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  const measurementId = getMeasurementId();
  if (!measurementId) {
    if (import.meta.env.DEV) {
      console.debug(`[Analytics Mock] Event [${eventName}]:`, params);
    }
    return;
  }

  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/**
 * Track Core Web Vitals to GA4 as Custom Events
 */
export function trackWebVital(metric: WebVitalMetric): void {
  trackEvent('web_vitals', {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_rating: metric.rating,
    metric_id: metric.id,
  });
}

/**
 * Native PerformanceObserver for Core Web Vitals (Zero external dependencies)
 */
function initPerformanceObservers(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    // 1. Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (lastEntry) {
        const val = lastEntry.startTime;
        trackWebVital({
          name: 'LCP',
          value: val,
          rating: val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor',
          delta: val,
          id: `lcp-${Date.now()}`,
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // 2. Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
        if (!entry.hadRecentInput && typeof entry.value === 'number') {
          clsValue += entry.value;
        }
      }
      trackWebVital({
        name: 'CLS',
        value: clsValue,
        rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor',
        delta: clsValue,
        id: `cls-${Date.now()}`,
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // 3. First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntriesByName('first-contentful-paint');
      if (entries.length > 0) {
        const val = entries[0].startTime;
        trackWebVital({
          name: 'FCP',
          value: val,
          rating: val <= 1800 ? 'good' : val <= 3000 ? 'needs-improvement' : 'poor',
          delta: val,
          id: `fcp-${Date.now()}`,
        });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Graceful fallback if any observer type is unsupported by older browsers
  }
}
