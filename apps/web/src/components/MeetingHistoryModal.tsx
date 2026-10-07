import { AdaptiveDialog } from './common/AdaptiveDialog';
import React, { useEffect, useState } from 'react';
import { X, Clock, Users, ExternalLink } from 'lucide-react';
import { meetingApi } from '../api/meetingApi';
import { meetingStorage } from '../utils/meetingStorage';
import { MeetingHistoryItemDto } from '../types/meeting';
import { useNavigate } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

export const MeetingHistoryModal: React.FC<Props> = ({ isOpen, onClose, email }) => {
  const [history, setHistory] = useState<MeetingHistoryItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const local = meetingStorage.getLocalHistory();
        let cloud: MeetingHistoryItemDto[] = [];
        try {
          cloud = await meetingApi.getMeetingHistory(email);
        } catch (err) {
          console.warn('Could not fetch cloud history', err);
        }

        const mergedMap = new Map<string, MeetingHistoryItemDto>();
        local.forEach(item => mergedMap.set(item.meetingCode, item));
        cloud.forEach(item => mergedMap.set(item.meetingCode, item));

        const merged = Array.from(mergedMap.values()).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setHistory(merged);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [isOpen, email]);

  if (!isOpen) return null;

  return (
    <AdaptiveDialog label="Lịch sử cuộc họp" onClose={onClose} className="history-dialog">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1c1e26] rounded-2xl shadow-xl flex flex-col max-h-[calc(var(--app-height)-64px)]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Lịch sử cuộc họp
          </h2>
          <button type="button" aria-label="Đóng lịch sử cuộc họp" onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-sm text-zinc-500 py-8">Đang tải...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-sm text-zinc-500 py-8">Chưa có lịch sử cuộc họp nào.</div>
          ) : (
            history.map((item) => (
              <div key={item.meetingCode} className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#14151a]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.name || `Cuộc họp ${item.meetingCode}`}
                    </h3>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-3">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {item.participantCount || 0}</span>
                      <span className="font-mono bg-zinc-200 dark:bg-white/10 px-1 rounded">{item.meetingCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.hasMinutes && (
                      <button
                        onClick={() => navigate(`/recap/${item.meetingCode}`)}
                        className="text-xs flex items-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Xem biên bản
                      </button>
                    )}
                  </div>
                </div>
                {item.title && <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-2">{item.title}</div>}
                {item.summaryExcerpt && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                    {item.summaryExcerpt}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdaptiveDialog>
  );
};
