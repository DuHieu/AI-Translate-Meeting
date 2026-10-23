import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  RefreshCw,
  BookOpen,
  Plus,
  X,
  HardDrive,
  Radio,
  Sparkles,
  Languages,
} from 'lucide-react';
import {
  desktopModuleManager,
  ItGlossaryTerm,
  WorkspaceModuleItem,
} from '../../services/desktopModuleManager';
import { isDesktopApp } from '../../utils/desktopBridge';

interface ModuleManagerPanelProps {
  compact?: boolean;
}

export const ModuleManagerPanel: React.FC<ModuleManagerPanelProps> = ({ compact = false }) => {
  const [modules, setModules] = useState<WorkspaceModuleItem[]>(() =>
    desktopModuleManager.getModules(),
  );
  const [glossary, setGlossary] = useState<ItGlossaryTerm[]>(() =>
    desktopModuleManager.getItGlossary(),
  );
  const [activeTab, setActiveTab] = useState<'modules' | 'it-glossary'>('modules');
  const [isChecking, setIsChecking] = useState(false);
  const [isUpgradingAll, setIsUpgradingAll] = useState(false);

  // New IT Glossary term form
  const [newVi, setNewVi] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newJa, setNewJa] = useState('');
  const [newCategory, setNewCategory] = useState<ItGlossaryTerm['category']>('devops');

  useEffect(() => {
    return desktopModuleManager.subscribe((updated) => {
      setModules(updated);
    });
  }, []);

  const updatesAvailableCount = modules.filter(
    (m) => m.status === 'update_available' || m.version !== m.latestVersion,
  ).length;

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    try {
      await desktopModuleManager.checkForUpdates();
    } finally {
      window.setTimeout(() => setIsChecking(false), 300);
    }
  };

  const handleUpgradeAll = async () => {
    if (isUpgradingAll) return;
    setIsUpgradingAll(true);
    try {
      await desktopModuleManager.upgradeAllModules();
    } finally {
      setIsUpgradingAll(false);
    }
  };

  const handleAddGlossaryTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVi.trim() || !newEn.trim()) return;
    const updated = desktopModuleManager.addItGlossaryTerm({
      vi: newVi.trim(),
      en: newEn.trim(),
      ja: newJa.trim() || newEn.trim(),
      category: newCategory,
    });
    setGlossary(updated);
    setNewVi('');
    setNewEn('');
    setNewJa('');
  };

  const getCategoryIcon = (cat: WorkspaceModuleItem['category']) => {
    switch (cat) {
      case 'p2p':
        return <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'stt':
        return <Cpu className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'translation':
        return <Languages className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'glossary':
        return <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top ERP Sub-Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'modules'
                ? 'bg-[#0F766E] text-white'
                : 'bg-[#D8DEE6] dark:bg-[#0E1218] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Modules Lõi ({modules.length})</span>
            {updatesAvailableCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                {updatesAvailableCount} UPDATE
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('it-glossary')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'it-glossary'
                ? 'bg-[#0F766E] text-white'
                : 'bg-[#D8DEE6] dark:bg-[#0E1218] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Từ điển IT Workspace ({glossary.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isDesktopApp() ? 'TAURI NATIVE RUNTIME' : 'WEB / EDGE RUNTIME'}
          </span>

          <button
            type="button"
            onClick={() => void handleCheckUpdates()}
            disabled={isChecking}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#0E1218] hover:bg-slate-300/70 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Kiểm tra Manifest</span>
          </button>

          {updatesAvailableCount > 0 && (
            <button
              type="button"
              onClick={() => void handleUpgradeAll()}
              disabled={isUpgradingAll}
              className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isUpgradingAll ? 'Đang nâng cấp...' : `Nâng cấp tất cả (${updatesAvailableCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'modules' ? (
        <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-300 dark:border-slate-800 bg-[#D8DEE6]/60 dark:bg-[#0E1218]/60 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-500">
            <span>MODULE / KIẾN TRÚC HOT-SWAP</span>
            <span>TRẠNG THÁI &amp; PHIÊN BẢN</span>
          </div>

          <div className="divide-y divide-slate-300/80 dark:divide-slate-800">
            {modules.map((mod) => {
              const hasUpdate = mod.status === 'update_available' || mod.version !== mod.latestVersion;
              const isDownloading = mod.status === 'downloading';

              return (
                <div
                  key={mod.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-300/25 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryIcon(mod.category)}
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {mod.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {mod.name}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        ({mod.sizeLabel})
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      {mod.description}
                    </p>

                    {!compact && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Nguồn: {mod.sourceRepo}</span>
                        <span>•</span>
                        <span>Ứng dụng IT: {mod.itUseCase}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        v{mod.version}
                        {hasUpdate && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1.5">
                            → v{mod.latestVersion}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Cập nhật: {mod.lastUpdated}
                      </div>
                    </div>

                    {isDownloading ? (
                      <div className="w-36 space-y-1">
                        <div className="h-2 w-full rounded bg-[#D8DEE6] dark:bg-[#0E1218] overflow-hidden">
                          <div
                            className="h-full bg-[#0F766E] dark:bg-teal-400 transition-all duration-150"
                            style={{ width: `${mod.progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-mono text-right text-teal-600 dark:text-teal-400">
                          Đang nạp {mod.progress}%...
                        </div>
                      </div>
                    ) : hasUpdate ? (
                      <button
                        type="button"
                        onClick={() => void desktopModuleManager.upgradeModule(mod.id)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Nâng cấp v{mod.latestVersion}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ACTIVE
                        </span>
                        <button
                          type="button"
                          onClick={() => void desktopModuleManager.upgradeModule(mod.id)}
                          title="Nạp lại (Hot-Reload) module này"
                          className="min-h-[40px] px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#0E1218] hover:bg-slate-300/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add New IT Term Form */}
          <form
            onSubmit={handleAddGlossaryTerm}
            className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
          >
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">
                Thuật ngữ Tiếng Việt
              </label>
              <input
                type="text"
                value={newVi}
                onChange={(e) => setNewVi(e.target.value)}
                placeholder="VD: Kiểm thử hồi quy"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">
                English (IT Standard)
              </label>
              <input
                type="text"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="VD: Regression Testing"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">
                日本語 (BrSE / Offshore)
              </label>
              <input
                type="text"
                value={newJa}
                onChange={(e) => setNewJa(e.target.value)}
                placeholder="VD: リグレッションテスト"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono uppercase text-slate-500 mb-1">
                Phân nhóm
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ItGlossaryTerm['category'])}
                className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              >
                <option value="devops">DevOps / CI-CD</option>
                <option value="agile">Agile / Scrum</option>
                <option value="architecture">Architecture</option>
                <option value="incident">Incident / SLA</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <button
                type="submit"
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="sm:hidden">Thêm</span>
              </button>
            </div>
          </form>

          {/* IT Glossary Table */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#151A22] overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 border-b border-slate-300 dark:border-slate-800 bg-[#D8DEE6]/60 dark:bg-[#0E1218]/60 text-[11px] font-mono uppercase tracking-wider text-slate-500">
              <div className="col-span-2">NHÓM</div>
              <div className="col-span-3">TIẾNG VIỆT</div>
              <div className="col-span-3">ENGLISH</div>
              <div className="col-span-4">日本語 (NHẬT)</div>
            </div>
            <div className="divide-y divide-slate-300/80 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {glossary.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 px-4 py-2.5 text-xs items-center hover:bg-slate-300/25 dark:hover:bg-slate-800/30"
                >
                  <div className="col-span-2">
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#D8DEE6] dark:bg-[#0E1218] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <div className="col-span-3 font-medium text-slate-900 dark:text-white pr-2">
                    {item.vi}
                  </div>
                  <div className="col-span-3 font-mono text-slate-700 dark:text-slate-300 pr-2">
                    {item.en}
                  </div>
                  <div className="col-span-4 font-mono text-teal-800 dark:text-teal-300">
                    {item.ja}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ModuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModuleManagerModal: React.FC<ModuleManagerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý & Nâng cấp Module Hệ thống"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="w-full max-w-4xl rounded-2xl border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#0E1218] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-3.5 border-b border-slate-300 dark:border-slate-800 bg-[#E4E9F0] dark:bg-[#131820] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-[#0F766E] dark:text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Trình Quản lý &amp; Nâng cấp Module Động (Hot-Swap ERP)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cập nhật các module STT, Dịch thuật, P2P Mesh và Từ điển IT trực tiếp từ Manifest mà không cần cài lại ứng dụng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng quản lý module"
            className="min-w-[40px] min-h-[40px] rounded-lg border border-slate-300 dark:border-slate-700 bg-[#D8DEE6] dark:bg-[#151A22] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          <ModuleManagerPanel />
        </div>
      </div>
    </div>
  );
};
