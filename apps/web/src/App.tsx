import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const PreJoinPage = lazy(() => import('./pages/PreJoinPage').then((module) => ({ default: module.PreJoinPage })));
const MeetingPage = lazy(() => import('./pages/MeetingPage').then((module) => ({ default: module.MeetingPage })));
const DevelopersPage = lazy(() => import('./pages/DevelopersPage').then((module) => ({ default: module.DevelopersPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));

const PageFallback: React.FC = () => (
  <div className="min-h-screen bg-[#0f0f10] text-zinc-200 flex items-center justify-center">
    <div className="flex items-center gap-3 rounded-xl border border-[#3a3a3d] bg-[#1a1a1b] px-4 py-3 text-sm shadow-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
      <span>Đang tải giao diện họp...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/developers" element={<DevelopersPage />} />
              <Route path="/prejoin/:meetingCode" element={<PreJoinPage />} />
              <Route path="/join/:meetingCode" element={<PreJoinPage />} />
              <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
