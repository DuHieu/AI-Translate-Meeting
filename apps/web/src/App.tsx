import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PreJoinPage } from './pages/PreJoinPage';
import { MeetingPage } from './pages/MeetingPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/prejoin/:meetingCode" element={<PreJoinPage />} />
        <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
