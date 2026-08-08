import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../api/meetingApi';
import { Video, Plus, ArrowRight, Sparkles, Globe } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateNewMeeting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await meetingApi.createMeeting('AI Translate Meeting');
      navigate(`/prejoin/${res.meetingCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create meeting';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCodeInput.trim()) {
      setError('Please enter a meeting code.');
      return;
    }
    const code = meetingCodeInput.trim().toUpperCase();
    navigate(`/prejoin/${code}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Video className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-100 text-base md:text-lg tracking-tight">
            AI Translate Meeting
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>Real-time Multilingual Conferencing</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 flex flex-col md:flex-row items-center justify-between gap-12 py-12">
        {/* Left Column: Call to Action */}
        <div className="max-w-xl space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" /> Next-Gen AI Translation Platform
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Meetings without language barriers.
          </h1>

          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Connect, collaborate, and translate in real time between Vietnamese, English, and Japanese.
          </p>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              type="button"
              onClick={handleCreateNewMeeting}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'New meeting'}</span>
            </button>

            <form onSubmit={handleJoinWithCode} className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter meeting code"
                value={meetingCodeInput}
                onChange={(e) => setMeetingCodeInput(e.target.value.toUpperCase())}
                className="bg-slate-900 border border-slate-800 text-slate-100 text-sm rounded-2xl p-3.5 outline-none focus:ring-2 focus:ring-sky-500 uppercase font-mono tracking-wider w-full sm:w-56"
              />
              <button
                type="submit"
                className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                title="Join meeting"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Visual Preview Banner */}
        <div className="w-full max-w-md aspect-video bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="font-mono text-sky-400 font-bold">AB7K29</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">● Connected</span>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
              Hieu (vi)
            </div>
            <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
              Tanaka (ja)
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 font-medium">
            Real-Time Speech-to-Text & Subtitle Translation
          </div>
        </div>
      </main>
    </div>
  );
};
