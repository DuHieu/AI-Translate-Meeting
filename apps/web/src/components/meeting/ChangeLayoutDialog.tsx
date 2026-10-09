import { AdaptiveDialog } from '../common/AdaptiveDialog';
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
      title: 'Tự động (Auto)',
      desc: 'Tự động chọn bố cục tối ưu dựa trên người đang phát biểu và số lượng thành viên.',
      icon: <Layout className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'tiled',
      title: 'Lưới ô vuông (Tiled)',
      desc: 'Hiển thị tất cả người tham gia với kích thước đồng đều trên lưới thích ứng.',
      icon: <Grid className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'spotlight',
      title: 'Tiêu điểm (Spotlight)',
      desc: 'Tập trung toàn màn hình vào người đang phát biểu hoặc người được ghim.',
      icon: <Square className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'sidebar',
      title: 'Thanh bên (Sidebar)',
      desc: 'Hiển thị người nói chính ở khung lớn kèm dải video thành viên ở cạnh bên.',
      icon: <SidebarIcon className="w-5 h-5 text-sky-400" />,
    },
  ];

  return (
    <AdaptiveDialog label="Bố cục cuộc họp" onClose={onClose} className="meeting-device-dialog">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-none p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-100">Đổi bố cục hiển thị</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cài đặt" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {layouts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectLayout(item.id);
                onClose();
              }}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
                currentLayout === item.id
                  ? 'bg-sky-500/10 border-sky-500/50 text-white'
                  : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>{item.title}</span>
                  {currentLayout === item.id && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </AdaptiveDialog>
  );
};
