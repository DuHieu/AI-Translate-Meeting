import React from 'react';
import { X, Grid, Layout, Square, Sidebar as SidebarIcon, Check } from 'lucide-react';

export type LayoutMode = 'auto' | 'tiled' | 'spotlight' | 'sidebar';

interface ChangeLayoutDialogProps {
  currentLayout: LayoutMode;
  onSelectLayout: (mode: LayoutMode) => void;
  onClose: () => void;
}

export const ChangeLayoutDialog: React.FC<ChangeLayoutDialogProps> = ({
  currentLayout,
  onSelectLayout,
  onClose,
}) => {
  const layouts: { id: LayoutMode; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'auto',
      title: 'Auto',
      desc: 'Automatically chooses the best layout based on speaker and participants.',
      icon: <Layout className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'tiled',
      title: 'Tiled',
      desc: 'Shows all participants equal size in an adaptive grid.',
      icon: <Grid className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'spotlight',
      title: 'Spotlight',
      desc: 'Focuses on the active speaker or pinned participant in full view.',
      icon: <Square className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'sidebar',
      title: 'Sidebar',
      desc: 'Displays the main speaker with other participants in a filmstrip.',
      icon: <SidebarIcon className="w-5 h-5 text-sky-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-slate-100">Change Meeting Layout</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {layouts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectLayout(item.id);
                onClose();
              }}
              className={`w-full p-4 rounded-2xl border text-left flex items-start gap-4 transition ${
                currentLayout === item.id
                  ? 'bg-sky-500/10 border-sky-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>{item.title}</span>
                  {currentLayout === item.id && <Check className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
