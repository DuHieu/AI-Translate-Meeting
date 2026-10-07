import type { BrandingConfigDto } from '../api/meetingApi';
import type { MeetingActionItem } from '../types/meeting';

export interface BrandedMeetingReport {
  meetingCode: string;
  title: string;
  createdAt: string;
  executiveHighlights: string[];
  decisions: string[];
  actionItems: MeetingActionItem[];
}

function safePrimaryColor(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#0284c7';
}

function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === 'data:') return /^data:image\//i.test(url) ? url : null;
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = doc.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

export async function exportBrandedMeetingPdf(
  report: BrandedMeetingReport,
  branding: BrandingConfigDto,
): Promise<void> {
  const reportWindow = window.open('', '_blank', 'width=980,height=760');
  if (!reportWindow) throw new Error('Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up và thử lại.');
  reportWindow.opener = null;

  const doc = reportWindow.document;
  doc.title = `${report.title} - ${report.meetingCode}`;
  doc.documentElement.lang = 'vi';

  const style = doc.createElement('style');
  const primaryColor = safePrimaryColor(branding.primaryColor);
  style.textContent = `
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #18181b; font: 13px/1.55 Inter, Arial, sans-serif; }
    .page { max-width: 760px; margin: 0 auto; }
    .brand-header { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 3px solid ${primaryColor}; }
    .logo { max-width: 120px; max-height: 54px; object-fit: contain; }
    .brand-name { color: ${primaryColor}; font-size: 19px; font-weight: 800; }
    .slogan, .meta, .empty { color: #71717a; }
    h1 { margin: 24px 0 4px; font-size: 25px; line-height: 1.25; }
    h2 { margin: 24px 0 10px; color: ${primaryColor}; font-size: 15px; text-transform: uppercase; letter-spacing: .04em; }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #d4d4d8; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f5; font-size: 11px; text-transform: uppercase; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #d4d4d8; color: #71717a; font-size: 11px; }
    @media print { .page { max-width: none; } }
  `;
  doc.head.append(style);

  const page = doc.createElement('main');
  page.className = 'page';
  const header = doc.createElement('header');
  header.className = 'brand-header';
  const logoUrl = safeLogoUrl(branding.logoUrl);
  let logo: HTMLImageElement | null = null;
  if (logoUrl) {
    logo = doc.createElement('img');
    logo.className = 'logo';
    logo.alt = `${branding.brandName} logo`;
    logo.src = logoUrl;
    header.append(logo);
  }
  const brandCopy = doc.createElement('div');
  brandCopy.append(
    createTextElement(doc, 'div', branding.brandName, 'brand-name'),
    createTextElement(doc, 'div', branding.slogan, 'slogan'),
  );
  header.append(brandCopy);
  page.append(header);

  page.append(
    createTextElement(doc, 'h1', report.title),
    createTextElement(
      doc,
      'p',
      `Mã cuộc họp: ${report.meetingCode.toUpperCase()} · ${new Date(report.createdAt).toLocaleString('vi-VN')}`,
      'meta',
    ),
  );

  const appendListSection = (title: string, items: string[], emptyText: string) => {
    page.append(createTextElement(doc, 'h2', title));
    if (items.length === 0) {
      page.append(createTextElement(doc, 'p', emptyText, 'empty'));
      return;
    }
    const list = doc.createElement('ul');
    items.forEach((item) => list.append(createTextElement(doc, 'li', item)));
    page.append(list);
  };

  appendListSection('Executive highlights', report.executiveHighlights, 'Chưa có điểm chính được ghi nhận.');
  appendListSection('Decisions', report.decisions, 'Chưa có quyết định được ghi nhận.');

  page.append(createTextElement(doc, 'h2', 'Action items'));
  if (report.actionItems.length === 0) {
    page.append(createTextElement(doc, 'p', 'Chưa có action item được ghi nhận.', 'empty'));
  } else {
    const table = doc.createElement('table');
    const head = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    ['Công việc', 'Owner', 'Deadline', 'Priority'].forEach((label) => headRow.append(createTextElement(doc, 'th', label)));
    head.append(headRow);
    const body = doc.createElement('tbody');
    report.actionItems.forEach((item) => {
      const row = doc.createElement('tr');
      [item.task, item.owner || 'Chưa gán', item.deadline || 'Chưa đặt', item.priority || 'Medium']
        .forEach((value) => row.append(createTextElement(doc, 'td', value)));
      body.append(row);
    });
    table.append(head, body);
    page.append(table);
  }

  page.append(createTextElement(doc, 'footer', `${branding.copyrightText} · ${branding.slogan}`));
  doc.body.replaceChildren(page);

  if (logo) {
    await Promise.race([
      logo.decode().catch(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, 800)),
    ]);
  }
  reportWindow.focus();
  reportWindow.print();
}
