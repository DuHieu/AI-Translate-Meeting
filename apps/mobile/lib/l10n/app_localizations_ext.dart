import 'app_localizations.dart';

/// Helpers kept outside generated/hand-written getters.
extension AppLocalizationsX on AppLocalizations {
  String languageLabel(String code) {
    switch (code) {
      case 'vi':
        return vietnamese;
      case 'ja':
        return japanese;
      case 'en':
      default:
        return english;
    }
  }

  String errorForKey(String? key) {
    switch (key) {
      case 'invalid_meeting_code':
        return invalidMeetingCode;
      case 'meeting_not_found':
        return meetingNotFound;
      case 'meeting_ended':
        return meetingEnded;
      case 'create_meeting_unauthorized':
        return createMeetingUnauthorized;
      case 'network_error':
        return networkError;
      case 'display_name_required':
        return displayNameRequired;
      case 'livekit_connect_failed':
        return livekitConnectFailed;
      case 'camera_toggle_failed':
        return cameraToggleFailed;
      case 'mic_toggle_failed':
        return micToggleFailed;
      case 'subtitle_connect_failed':
        return subtitleConnectFailed;
      case 'camera_flip_failed':
        return cameraFlipFailed;
      case 'speaker_toggle_failed':
        return speakerToggleFailed;
      case 'network_reconnect_failed':
        return networkReconnectFailed;
      default:
        return unexpectedError;
    }
  }

  String infoForKey(String? key) {
    switch (key) {
      case 'network_reconnecting':
        return networkReconnecting;
      case 'network_restored':
        return networkRestored;
      case 'video_degraded':
        return videoDegraded;
      case 'camera_flipped':
        return cameraFlipped;
      default:
        return errorForKey(key);
    }
  }
}
