import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const PreJoinPage = lazy(() => import('./pages/PreJoinPage').then((module) => ({ default: module.PreJoinPage })));
const MeetingPage = lazy(() => import('./pages/MeetingPage').then((module) => ({ default: module.MeetingPage })));

const PageFallback: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm shadow-xl">
      <span className="h-2.5 w-2.5 rounded-full bg-sky-400 animate-pulse" />
      <span>Đang tải giao diện họp...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/prejoin/:meetingCode" element={<PreJoinPage />} />
          <Route path="/join/:meetingCode" element={<PreJoinPage />} />
          <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
