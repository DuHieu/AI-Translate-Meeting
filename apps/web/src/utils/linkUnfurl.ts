export interface ParsedRichLink {
  url: string;
  hostname: string;
  isLayaMeetLink: boolean;
  meetingCode?: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

export function extractLinksFromText(text: string): ParsedRichLink[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  const uniqueUrls = Array.from(new Set(matches.map((raw) => raw.replace(/[.,;!?)]+$/, ''))));
  const parsed: ParsedRichLink[] = [];

  for (const rawUrl of uniqueUrls) {
    try {
      const urlObj = new URL(rawUrl);
      const hostname = urlObj.hostname.replace(/^www\./i, '');
      const roomMatch = urlObj.pathname.match(/^\/(?:prejoin|join|meeting)\/([A-Za-z0-9_-]+)/i);
      const isSameOrigin = typeof window !== 'undefined' && urlObj.origin === window.location.origin;
      const isLayaDomain = /layameet|vimeet|localhost|trycloudflare|ngrok/i.test(hostname);

      parsed.push({
        url: urlObj.toString(),
        hostname,
        isLayaMeetLink: Boolean(roomMatch) || isSameOrigin || isLayaDomain,
        meetingCode: roomMatch ? roomMatch[1].toUpperCase() : undefined,
      });
    } catch {
      // Ignore malformed URLs
    }
  }

  return parsed;
}
