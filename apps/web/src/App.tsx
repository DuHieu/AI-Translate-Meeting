import { useVisualViewport } from './hooks/useVisualViewport';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { ScrollToTop } from './components/common/ScrollToTop';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';
import { isOpsSubdomain } from './utils/subdomain';
import { PAYMENT_ENABLED } from './config/featureFlags';
import { isDesktopApp } from './utils/desktopBridge';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const DesktopHomeScreen = lazy(() => import('./components/desktop/DesktopHomeScreen').then((module) => ({ default: module.DesktopHomeScreen })));
export const PreJoinPage = lazy(() => import('./pages/PreJoinPage').then((module) => ({ default: module.PreJoinPage })));
const MeetingPage = lazy(() => import('./pages/MeetingPage').then((module) => ({ default: module.MeetingPage })));
const DevelopersPage = lazy(() => import('./pages/DevelopersPage').then((module) => ({ default: module.DevelopersPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));
const LanguagePairLandingPage = lazy(() => import('./pages/LanguagePairLandingPage').then((module) => ({ default: module.LanguagePairLandingPage })));
const ComparisonLandingPage = lazy(() => import('./pages/ComparisonLandingPage').then((module) => ({ default: module.ComparisonLandingPage })));
const PublicRecapPage = lazy(() => import('./pages/PublicRecapPage').then((module) => ({ default: module.PublicRecapPage })));
const BlogListingPage = lazy(() => import('./pages/BlogListingPage').then((module) => ({ default: module.BlogListingPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const SystemStatusPage = lazy(() => import('./pages/SystemStatusPage').then((module) => ({ default: module.SystemStatusPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then((module) => ({ default: module.PricingPage })));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage').then((module) => ({ default: module.FeaturesPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then((module) => ({ default: module.FaqPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const PaymentPolicyPage = lazy(() => import('./pages/PaymentPolicyPage').then((module) => ({ default: module.PaymentPolicyPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((module) => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then((module) => ({ default: module.TermsOfServicePage })));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage').then((module) => ({ default: module.RefundPolicyPage })));
const DeliveryPolicyPage = lazy(() => import('./pages/DeliveryPolicyPage').then((module) => ({ default: module.DeliveryPolicyPage })));

const LegacyMeetingRedirect: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const location = useLocation();
  return <Navigate to={`/meeting/${meetingCode || ''}${location.search}`} replace />;
};

const PageFallback: React.FC = () => (
  <div className="min-h-screen bg-[#0f0f10] text-zinc-200 flex items-center justify-center">
    <div className="flex items-center gap-3 rounded-xl border border-[#3a3a3d] bg-[#1a1a1b] px-4 py-3 text-sm shadow-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
      <span>Đang tải giao diện họp...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  useVisualViewport();
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    isOpsSubdomain() ? (
                      <AdminRouteGuard>
                        <AdminDashboardPage />
                      </AdminRouteGuard>
                    ) : isDesktopApp() ? (
                      <DesktopHomeScreen />
                    ) : (
                      <HomePage />
                    )
                  }
                />
                <Route path="/desktop" element={<DesktopHomeScreen />} />
                <Route path="/ja" element={<HomePage forcedLanguage="ja" />} />
                <Route path="/en" element={<HomePage forcedLanguage="en" />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route
                  path="/admin"
                  element={
                    <AdminRouteGuard>
                      <AdminDashboardPage />
                    </AdminRouteGuard>
                  }
                />
                <Route path="/developers" element={<DevelopersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/system-status" element={<SystemStatusPage />} />
                {PAYMENT_ENABLED ? (
                  <>
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/vi/pricing" element={<PricingPage forcedLanguage="vi" />} />
                    <Route path="/en/pricing" element={<PricingPage forcedLanguage="en" />} />
                    <Route path="/ja/pricing" element={<PricingPage forcedLanguage="ja" />} />
                  </>
                ) : (
                  <>
                    <Route path="/pricing" element={<Navigate to="/" replace />} />
                    <Route path="/vi/pricing" element={<Navigate to="/" replace />} />
                    <Route path="/en/pricing" element={<Navigate to="/" replace />} />
                    <Route path="/ja/pricing" element={<Navigate to="/" replace />} />
                  </>
                )}
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/vi/features" element={<FeaturesPage forcedLanguage="vi" />} />
                <Route path="/en/features" element={<FeaturesPage forcedLanguage="en" />} />
                <Route path="/ja/features" element={<FeaturesPage forcedLanguage="ja" />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/vi/faq" element={<FaqPage forcedLanguage="vi" />} />
                <Route path="/en/faq" element={<FaqPage forcedLanguage="en" />} />
                <Route path="/ja/faq" element={<FaqPage forcedLanguage="ja" />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/vi/contact" element={<ContactPage forcedLanguage="vi" />} />
                <Route path="/en/contact" element={<ContactPage forcedLanguage="en" />} />
                <Route path="/ja/contact" element={<ContactPage forcedLanguage="ja" />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/vi/calendar" element={<CalendarPage forcedLanguage="vi" />} />
                <Route path="/en/calendar" element={<CalendarPage forcedLanguage="en" />} />
                <Route path="/ja/calendar" element={<CalendarPage forcedLanguage="ja" />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/vi/history" element={<HistoryPage forcedLanguage="vi" />} />
                <Route path="/en/history" element={<HistoryPage forcedLanguage="en" />} />
                <Route path="/ja/history" element={<HistoryPage forcedLanguage="ja" />} />
                <Route path="/cai-dat" element={<Navigate to="/settings" replace />} />
                <Route path="/cam-nang" element={<BlogListingPage forcedLanguage="vi" />} />
                <Route path="/cam-nang/:slug" element={<BlogPostPage />} />
                <Route path="/vi/guide" element={<BlogListingPage forcedLanguage="vi" />} />
                <Route path="/vi/guide/:slug" element={<BlogPostPage />} />
                <Route path="/en/guide" element={<BlogListingPage forcedLanguage="en" />} />
                <Route path="/en/guide/:slug" element={<BlogPostPage />} />
                <Route path="/ja/guide" element={<BlogListingPage forcedLanguage="ja" />} />
                <Route path="/ja/guide/:slug" element={<BlogPostPage />} />
                <Route path="/hop-song-ngu-tieng-nhat" element={<LanguagePairLandingPage variant="japanese" />} />
                <Route path="/hop-song-ngu-tieng-anh" element={<LanguagePairLandingPage variant="english" />} />
                <Route path="/hop-song-ngu-tieng-trung" element={<LanguagePairLandingPage variant="chinese" />} />
                <Route path="/hop-song-ngu-tieng-han" element={<LanguagePairLandingPage variant="korean" />} />
                <Route path="/so-sanh/layameet-vs-zoom" element={<ComparisonLandingPage competitor="zoom" />} />
                <Route path="/so-sanh/layameet-vs-google-meet" element={<ComparisonLandingPage competitor="google-meet" />} />
                <Route path="/chinh-sach-thanh-toan" element={<PaymentPolicyPage />} />
                <Route path="/payment-policy" element={<PaymentPolicyPage />} />
                <Route path="/payment" element={<PaymentPolicyPage />} />
                <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicyPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/dieu-khoan-dich-vu" element={<TermsOfServicePage />} />
                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/chinh-sach-khieu-nai-hoan-tien" element={<RefundPolicyPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                <Route path="/refund" element={<RefundPolicyPage />} />
                <Route path="/chinh-sach-giao-nhan-cung-cap-dich-vu" element={<DeliveryPolicyPage />} />
                <Route path="/delivery-policy" element={<DeliveryPolicyPage />} />
                <Route path="/delivery" element={<DeliveryPolicyPage />} />
                <Route path="/prejoin/:meetingCode" element={<LegacyMeetingRedirect />} />
                <Route path="/join/:meetingCode" element={<LegacyMeetingRedirect />} />
                <Route path="/meeting/:meetingCode" element={<MeetingPage />} />
                <Route path="/recap/:meetingCode" element={<PublicRecapPage />} />
              </Routes>
            </Suspense>
            <CookieConsentBanner />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
