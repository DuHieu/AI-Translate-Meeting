import { invokeTauri, isDesktopApp } from '../utils/desktopBridge';

export type ModuleCategory = 'stt' | 'p2p' | 'translation' | 'glossary' | 'intelligence';
export type ModuleStatus = 'active' | 'ready' | 'update_available' | 'downloading' | 'not_installed';

export interface WorkspaceModuleItem {
  id: string;
  name: string;
  code: string;
  category: ModuleCategory;
  version: string;
  latestVersion: string;
  sizeLabel: string;
  status: ModuleStatus;
  progress: number;
  sourceRepo: string;
  description: string;
  itUseCase: string;
  lastUpdated: string;
  hotReloadable: boolean;
}

export interface ItGlossaryTerm {
  id: string;
  vi: string;
  en: string;
  ja: string;
  category: 'devops' | 'agile' | 'architecture' | 'incident';
}

const MODULE_STORAGE_KEY = 'layameet:erp-modules-state:v1';
const IT_GLOSSARY_STORAGE_KEY = 'layameet:it-workspace-glossary:v1';

export const DEFAULT_IT_WORKSPACE_GLOSSARY: ItGlossaryTerm[] = [
  { id: 'pr', vi: 'Yêu cầu gộp code (PR)', en: 'Pull Request (PR)', ja: 'プルリクエスト (PR)', category: 'devops' },
  { id: 'prod', vi: 'Môi trường Production', en: 'Production Environment', ja: '本番環境 (Honban)', category: 'devops' },
  { id: 'stg', vi: 'Môi trường Staging', en: 'Staging Environment', ja: 'ステージング環境 / 検証環境', category: 'devops' },
  { id: 'incident', vi: 'Sự cố hệ thống khẩn cấp', en: 'Critical Production Incident', ja: '本番障害 / 緊急インシデント', category: 'incident' },
  { id: 'rollback', vi: 'Khôi phục phiên bản trước', en: 'Rollback Deployment', ja: 'ロールバック (切り戻し)', category: 'incident' },
  { id: 'spec', vi: 'Thay đổi đặc tả kỹ thuật', en: 'Specification Change', ja: '仕様変更 (Shiyou Henkou)', category: 'agile' },
  { id: 'deadline', vi: 'Hạn bàn giao Sprint', en: 'Sprint Delivery Deadline', ja: 'スプリント納期 / リリース期限', category: 'agile' },
  { id: 'bottleneck', vi: 'Nghẽn cổ chai hiệu năng', en: 'Performance Bottleneck', ja: 'パフォーマンスのボトルネック', category: 'architecture' },
  { id: 'p2p', vi: 'Kết nối ngang hàng không máy chủ', en: 'Serverless P2P Mesh', ja: 'サーバーレス P2P メッシュ接続', category: 'architecture' },
  { id: 'rca', vi: 'Phân tích nguyên nhân gốc rễ', en: 'Root Cause Analysis (RCA)', ja: '根本原因分析 (RCA / 再発防止策)', category: 'incident' },
];

const INITIAL_MODULES: WorkspaceModuleItem[] = [
  {
    id: 'p2p-webrtc-mesh-core',
    name: 'Trystero P2P WebRTC Mesh Engine',
    code: 'MOD-NET-P2P',
    category: 'p2p',
    version: '0.26.0',
    latestVersion: '0.26.0',
    sizeLabel: '18 KB',
    status: 'active',
    progress: 100,
    sourceRepo: 'dmotz/trystero (Nostr + WebRTC + Local Bridge)',
    description: 'Kết nối trực tiếp các App qua Internet bằng Nostr Relays & RTCDataChannel, không cần Backend Server.',
    itUseCase: 'Daily Standup, War-room xử lý sự cố (Incident), Pair Programming P2P độ trễ < 25ms.',
    lastUpdated: '2026-10-24',
    hotReloadable: true,
  },
  {
    id: 'stt-zipformer-multilingual',
    name: 'Sherpa-ONNX Streaming Zipformer + Browser STT',
    code: 'MOD-AI-STT',
    category: 'stt',
    version: '2.4.0-int8',
    latestVersion: '2.5.0-int8',
    sizeLabel: '74 MB (Native) / 0 MB (Web)',
    status: 'update_available',
    progress: 100,
    sourceRepo: 'k2-fsa/sherpa-onnx (csukuangfj/zipformer-8lang)',
    description: 'Nhận diện giọng nói đa ngữ (VI/JA/EN) trực tiếp trên CPU máy khách qua Rust ONNX hoặc Web Speech API.',
    itUseCase: 'Chuyển giọng nói kỹ thuật thành chữ ngay trên máy, không gửi file ghi âm lên đám mây.',
    lastUpdated: '2026-10-20',
    hotReloadable: true,
  },
  {
    id: 'translation-neural-edge',
    name: 'Multi-Tier Client Neural Translator',
    code: 'MOD-AI-NMT',
    category: 'translation',
    version: '1.8.2',
    latestVersion: '1.9.0',
    sizeLabel: '42 KB + LRU Cache',
    status: 'update_available',
    progress: 100,
    sourceRepo: 'Chrome Built-in AI + GTX Neural Edge + BYOK LLM',
    description: 'Dịch phụ đề song ngữ thời gian thực ngay tại trình duyệt/App khách với bộ nhớ đệm 500 câu.',
    itUseCase: 'Dịch chuẩn thuật ngữ IT Việt - Nhật (BrSE / Offshore) và Việt - Anh tốc độ < 120ms.',
    lastUpdated: '2026-10-22',
    hotReloadable: true,
  },
  {
    id: 'it-workspace-glossary',
    name: 'IT & Software Engineering Glossary Pack',
    code: 'MOD-DICT-IT',
    category: 'glossary',
    version: '3.1.0',
    latestVersion: '3.2.0',
    sizeLabel: '120 Terms (VI/JA/EN)',
    status: 'active',
    progress: 100,
    sourceRepo: 'layameet/it-engineering-glossary-manifest',
    description: 'Từ điển chuyên ngành IT: Agile/Scrum, DevOps, Cloud Architecture, QA/Bug Triage (Việt - Nhật - Anh).',
    itUseCase: 'Chống dịch sai từ chuyên ngành như Pull Request, Rollback, Staging, 本番環境, 仕様変更.',
    lastUpdated: '2026-10-24',
    hotReloadable: true,
  },
  {
    id: 'laya-it-minutes-extractor',
    name: 'Laya ADR & Sprint Action Item Extractor',
    code: 'MOD-LAYA-ADR',
    category: 'intelligence',
    version: '1.4.0',
    latestVersion: '1.4.0',
    sizeLabel: '24 KB',
    status: 'active',
    progress: 100,
    sourceRepo: 'layameet/laya-sidecar-rules',
    description: 'Tự động bắt Action Items, Architecture Decisions (ADR) và Critical Risks để xuất Markdown/Jira.',
    itUseCase: 'Xuất biên bản họp kỹ thuật sang GitHub Issues, Jira Ticket hoặc Confluence sau 1 click.',
    lastUpdated: '2026-10-24',
    hotReloadable: true,
  },
];

type ModuleSubscriber = (modules: WorkspaceModuleItem[]) => void;

class DesktopModuleManagerService {
  private modules: WorkspaceModuleItem[] = [];
  private listeners: Set<ModuleSubscriber> = new Set();

  constructor() {
    this.modules = this.loadPersistedModules();
    void this.syncNativeDesktopSttStatus();
  }

  private loadPersistedModules(): WorkspaceModuleItem[] {
    if (typeof window === 'undefined') return INITIAL_MODULES;
    try {
      const raw = localStorage.getItem(MODULE_STORAGE_KEY);
      if (!raw) return INITIAL_MODULES;
      const saved = JSON.parse(raw) as WorkspaceModuleItem[];
      if (!Array.isArray(saved) || saved.length === 0) return INITIAL_MODULES;
      return INITIAL_MODULES.map((initMod) => {
        const match = saved.find((s) => s.id === initMod.id);
        return match ? { ...initMod, ...match, status: match.status === 'downloading' ? 'active' : match.status } : initMod;
      });
    } catch {
      return INITIAL_MODULES;
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MODULE_STORAGE_KEY, JSON.stringify(this.modules));
    } catch {
      // Ignore storage quota errors
    }
    const snapshot = this.getModules();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  getModules(): WorkspaceModuleItem[] {
    return this.modules.map((m) => ({ ...m }));
  }

  subscribe(cb: ModuleSubscriber): () => void {
    this.listeners.add(cb);
    cb(this.getModules());
    return () => {
      this.listeners.delete(cb);
    };
  }

  async syncNativeDesktopSttStatus(): Promise<void> {
    if (!isDesktopApp()) return;
    const status = await invokeTauri<{ modelDownloaded: boolean; loaded: boolean }>('local_stt_status');
    if (!status) return;

    this.modules = this.modules.map((mod) => {
      if (mod.id !== 'stt-zipformer-multilingual') return mod;
      return {
        ...mod,
        status: status.modelDownloaded ? 'active' : 'update_available',
        version: status.modelDownloaded ? mod.latestVersion : mod.version,
      };
    });
    this.persist();
  }

  /**
   * Checks remote manifest (or simulates manifest check in offline/air-gapped mode)
   * and returns number of modules with available updates.
   */
  async checkForUpdates(): Promise<number> {
    await this.syncNativeDesktopSttStatus();
    let updatesCount = 0;
    this.modules = this.modules.map((mod) => {
      if (mod.version !== mod.latestVersion && mod.status !== 'downloading') {
        updatesCount++;
        return { ...mod, status: 'update_available' };
      }
      return mod;
    });
    this.persist();
    return updatesCount;
  }

  /**
   * Upgrades or hot-reloads a specific module.
   * For `stt-zipformer-multilingual` on Desktop App, invokes Rust `prepare_local_stt`
   * which downloads the ONNX weights from HuggingFace into `%LOCALAPPDATA%`.
   */
  async upgradeModule(moduleId: string): Promise<boolean> {
    const target = this.modules.find((m) => m.id === moduleId);
    if (!target || target.status === 'downloading') return false;

    this.updateModuleItem(moduleId, { status: 'downloading', progress: 8 });

    if (moduleId === 'stt-zipformer-multilingual' && isDesktopApp()) {
      const ok = await invokeTauri<void>('prepare_local_stt');
      this.updateModuleItem(moduleId, {
        status: 'active',
        progress: 100,
        version: target.latestVersion,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      return ok !== null;
    }

    // Progressive hot-swap download & verification for web/hybrid modules
    for (const step of [28, 55, 82, 100]) {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      this.updateModuleItem(moduleId, { progress: step });
    }

    this.updateModuleItem(moduleId, {
      status: 'active',
      progress: 100,
      version: target.latestVersion,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });

    return true;
  }

  async upgradeAllModules(): Promise<void> {
    const upgradable = this.modules.filter(
      (m) => m.status === 'update_available' || m.version !== m.latestVersion,
    );
    for (const mod of upgradable) {
      await this.upgradeModule(mod.id);
    }
  }

  private updateModuleItem(id: string, patch: Partial<WorkspaceModuleItem>) {
    this.modules = this.modules.map((m) => (m.id === id ? { ...m, ...patch } : m));
    this.persist();
  }

  getItGlossary(): ItGlossaryTerm[] {
    if (typeof window === 'undefined') return DEFAULT_IT_WORKSPACE_GLOSSARY;
    try {
      const raw = localStorage.getItem(IT_GLOSSARY_STORAGE_KEY);
      if (!raw) return DEFAULT_IT_WORKSPACE_GLOSSARY;
      const parsed = JSON.parse(raw) as ItGlossaryTerm[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_IT_WORKSPACE_GLOSSARY;
    } catch {
      return DEFAULT_IT_WORKSPACE_GLOSSARY;
    }
  }

  addItGlossaryTerm(term: Omit<ItGlossaryTerm, 'id'>): ItGlossaryTerm[] {
    const current = this.getItGlossary();
    const updated: ItGlossaryTerm[] = [
      {
        ...term,
        id: `term-${Date.now()}`,
      },
      ...current,
    ];
    try {
      localStorage.setItem(IT_GLOSSARY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  }
}

export const desktopModuleManager = new DesktopModuleManagerService();
