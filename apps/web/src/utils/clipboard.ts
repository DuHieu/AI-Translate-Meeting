/** Copy from a user gesture; never report success when permission was denied. */
export async function copyText(text: string): Promise<boolean> {
  // Safari requires the clipboard request in the original user gesture.
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* A selectable field is the final fallback when copy is denied. */ }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  const previous = document.activeElement as HTMLElement | null;
  field.select();
  try { return document.execCommand('copy'); }
  catch { return false; }
  finally { field.remove(); previous?.focus({ preventScroll: true }); }
}
