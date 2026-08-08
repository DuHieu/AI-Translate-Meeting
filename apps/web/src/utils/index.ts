export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

export const LANGUAGE_NAMES: Record<string, string> = {
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese"
};
