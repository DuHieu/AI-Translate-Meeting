import React from 'react';
import { ConnectionErrorModal } from './ConnectionErrorModal';
import { PermissionBlockedModal } from './PermissionBlockedModal';
import { MeetingLanguageDialog } from './MeetingLanguageDialog';
import { ChangeLayoutDialog, LayoutMode } from './ChangeLayoutDialog';
import { MeetingSettingsDialog } from './MeetingSettingsDialog';
import { PostMeetingModal } from './PostMeetingModal';
import { LiveMeetingCopilot } from './LiveMeetingCopilot';
import { InlineGlossaryModal } from '../subtitle/InlineGlossaryModal';
import { MeetingReadyCard } from './MeetingReadyCard';
import { MeetingDetailsDialog } from './MeetingDetailsDialog';
import type { SidecarPreferences, SupportedLanguage } from '../../types/meeting';
import type { SubtitleMessage } from '../../types/subtitle';
import type { BrandingConfigDto } from '../../api/meetingApi';
import type { GeneratedRecap } from '../../utils/aiRecapEngine';

export interface MeetingModalsManagerProps {
  // Connection & Permission
  connectionError: string | null;
  onRetryConnection: () => void;
  onDismissConnectionError: () => void;
  blockedPermissionType: 'microphone' | 'camera' | 'both' | null;
  permissionErrorMessage?: string;
  onRetryPermissions: () => void;
  onDismissBlockedPermission: () => void;

  // Language Dialog
  isLanguageOpen: boolean;
  spokenLanguage: SupportedLanguage;
  subtitleTargetLanguage: SupportedLanguage;
  isUpdatingSubtitleLanguage: boolean;
  subtitleLanguageError: string | null;
  onTargetLanguageChange: (target: SupportedLanguage) => void;
  onCloseLanguage: () => void;
  onLeaveRoom: () => void;

  // Layout Dialog
  isLayoutMenuOpen: boolean;
  layoutMode: LayoutMode;
  onSelectLayout: (mode: LayoutMode) => void;
  onCloseLayoutMenu: () => void;

  // Settings Dialog
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  meetingId: string;
  meetingCode: string;
  sidecarPreferences: SidecarPreferences;
  onSidecarPreferencesChange: (preferences: SidecarPreferences) => void;

  // Post Meeting Recap
  isPostMeetingOpen: boolean;
  postMeetingRecap: GeneratedRecap;
  subtitleHistory: SubtitleMessage[];
  branding: BrandingConfigDto;
  recordingDownloadUrl: string | null;
  onClosePostMeeting: () => void;

  // Copilot & Glossary
  isCopilotOpen: boolean;
  onCloseCopilot: () => void;
  isGlossaryModalOpen: boolean;
  onCloseGlossaryModal: () => void;
  glossaryTerms: { source: string; target: string };

  // Meeting Ready Card & Details Dialog
  isMeetingReadyCardOpen: boolean;
  participantsCount: number;
  onCloseMeetingReadyCard: () => void;
  onOpenInvite: () => void;
  isInfoCardOpen: boolean;
  role: 'host' | 'participant';
  effectiveHostToken?: string;
  onCloseInfoCard: () => void;
}

export const MeetingModalsManager: React.FC<MeetingModalsManagerProps> = ({
  connectionError,
  onRetryConnection,
  onDismissConnectionError,
  blockedPermissionType,
  permissionErrorMessage,
  onRetryPermissions,
  onDismissBlockedPermission,
  isLanguageOpen,
  spokenLanguage,
  subtitleTargetLanguage,
  isUpdatingSubtitleLanguage,
  subtitleLanguageError,
  onTargetLanguageChange,
  onCloseLanguage,
  onLeaveRoom,
  isLayoutMenuOpen,
  layoutMode,
  onSelectLayout,
  onCloseLayoutMenu,
  isSettingsOpen,
  onCloseSettings,
  meetingId,
  meetingCode,
  sidecarPreferences,
  onSidecarPreferencesChange,
  isPostMeetingOpen,
  postMeetingRecap,
  subtitleHistory,
  branding,
  recordingDownloadUrl,
  onClosePostMeeting,
  isCopilotOpen,
  onCloseCopilot,
  isGlossaryModalOpen,
  onCloseGlossaryModal,
  glossaryTerms,
  isMeetingReadyCardOpen,
  participantsCount,
  onCloseMeetingReadyCard,
  onOpenInvite,
  isInfoCardOpen,
  role,
  effectiveHostToken,
  onCloseInfoCard,
}) => {
  return (
    <>
      {/* Network / Connection Error Alert */}
      {connectionError && (
        <ConnectionErrorModal
          errorMessage={connectionError}
          onRetry={onRetryConnection}
          onDismiss={onDismissConnectionError}
        />
      )}

      {/* Permission Blocked Guide Modal */}
      {blockedPermissionType && (
        <PermissionBlockedModal
          deviceType={blockedPermissionType}
          errorMessage={permissionErrorMessage}
          onRetry={onRetryPermissions}
          onDismiss={onDismissBlockedPermission}
        />
      )}

      {/* Language Dialog */}
      {isLanguageOpen && (
        <MeetingLanguageDialog
          spokenLanguage={spokenLanguage}
          targetLanguage={subtitleTargetLanguage}
          updating={isUpdatingSubtitleLanguage}
          error={subtitleLanguageError}
          onTargetChange={onTargetLanguageChange}
          onClose={onCloseLanguage}
          onRejoin={onLeaveRoom}
        />
      )}

      {/* Layout Selector Dialog */}
      {isLayoutMenuOpen && (
        <ChangeLayoutDialog
          currentLayout={layoutMode}
          onSelectLayout={onSelectLayout}
          onClose={onCloseLayoutMenu}
        />
      )}

      {/* Meeting Settings Dialog */}
      {isSettingsOpen && (
        <MeetingSettingsDialog
          onClose={onCloseSettings}
          meetingId={meetingId}
          meetingCode={meetingCode}
          sidecarPreferences={sidecarPreferences}
          onSidecarPreferencesChange={onSidecarPreferencesChange}
        />
      )}

      {/* Post Meeting Recap Modal */}
      <PostMeetingModal
        isOpen={isPostMeetingOpen}
        meetingCode={meetingCode}
        recap={postMeetingRecap}
        history={subtitleHistory}
        branding={branding}
        recordingDownloadUrl={recordingDownloadUrl}
        onClose={onClosePostMeeting}
        onLeaveRoom={onLeaveRoom}
      />

      {/* In-Meeting Live Copilot (Ctrl+K) */}
      <LiveMeetingCopilot
        isOpen={isCopilotOpen}
        onClose={onCloseCopilot}
        history={subtitleHistory}
        meetingCode={meetingCode}
      />

      {/* Inline Glossary Live Correction Modal */}
      <InlineGlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={onCloseGlossaryModal}
        meetingCode={meetingCode}
        initialSourceTerm={glossaryTerms.source}
        initialTargetTerm={glossaryTerms.target}
      />

      {/* Google Meet signature "Cuộc họp của bạn đã sẵn sàng" prompt */}
      <MeetingReadyCard
        meetingCode={meetingCode}
        isOpen={isMeetingReadyCardOpen && participantsCount <= 1}
        onClose={onCloseMeetingReadyCard}
        onOpenInvite={onOpenInvite}
      />

      {/* Meeting Details Dialog (ⓘ) */}
      {isInfoCardOpen && (
        <MeetingDetailsDialog
          meetingCode={meetingCode}
          role={role}
          hostToken={effectiveHostToken}
          onClose={onCloseInfoCard}
        />
      )}
    </>
  );
};
