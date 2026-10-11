import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'app_localizations_en.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_vi.dart';

/// App strings used by Home / Prejoin / Meeting Room screens.
///
/// Kept as hand-maintained delegates so the project compiles without
/// requiring `flutter gen-l10n` during CI bootstrap. Keep in sync with
/// `app_*.arb`.
abstract class AppLocalizations {
  AppLocalizations(this.localeName);

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    final localizations =
        Localizations.of<AppLocalizations>(context, AppLocalizations);
    assert(localizations != null, 'No AppLocalizations found in context');
    return localizations!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('en'),
    Locale('vi'),
    Locale('ja'),
  ];

  String get appName;
  String get homeTitle;
  String get homeSubtitle;
  String get createNewMeeting;
  String get joinByCode;
  String get joinMeeting;
  String get meetingCode;
  String get enterMeetingCode;
  String get clearMeetingCode;
  String get recentMeetings;
  String get noRecentMeetings;
  String get rejoin;
  String get displayName;
  String get displayNameHint;
  String get spokenLanguage;
  String get targetLanguage;
  String get vietnamese;
  String get japanese;
  String get english;
  String get cameraOn;
  String get cameraOff;
  String get micOn;
  String get micOff;
  String get cameraPreview;
  String get cameraUnavailable;
  String get micLevel;
  String get prejoinTitle;
  String get prejoinSubtitle;
  String get joinNow;
  String get leaveMeeting;
  String get invalidMeetingCode;
  String get meetingNotFound;
  String get meetingEnded;
  String get createMeetingUnauthorized;
  String get networkError;
  String get unexpectedError;
  String get displayNameRequired;
  String get loading;
  String get creatingMeeting;
  String get joiningMeeting;
  String get permissionRequiredTitle;
  String get permissionRequiredBody;
  String get openSettings;
  String get cancel;
  String get meetingRoomPlaceholder;
  String get meetingRoomPlaceholderBody;
  String get backToHome;
  String get participantIdLabel;
  String get meetingCodeLabel;
  String get waitingForParticipants;
  String get reconnecting;
  String get livekitConnectFailed;
  String get cameraToggleFailed;
  String get micToggleFailed;
  String get youLabel;
  String get subtitleReconnecting;
  String get subtitleUnavailable;
  String get subtitlePartial;
  String get subtitleConnectFailed;
  String get tagDecision;
  String get tagActionItem;
  String get flipCamera;
  String get speakerOn;
  String get speakerOff;
  String get leaveMeetingConfirmTitle;
  String get leaveMeetingConfirmBody;
  String get errorTitle;
  String get retry;
  String get networkExcellent;
  String get networkGood;
  String get networkPoor;
  String get networkUnknown;
  String get cameraFlipFailed;
  String get speakerToggleFailed;
  String get networkReconnectFailed;
  String get networkReconnecting;
  String get networkRestored;
  String get videoDegraded;
  String get cameraFlipped;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) =>
      ['en', 'vi', 'ja'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    switch (locale.languageCode) {
      case 'vi':
        return SynchronousFuture<AppLocalizations>(AppLocalizationsVi());
      case 'ja':
        return SynchronousFuture<AppLocalizations>(AppLocalizationsJa());
      case 'en':
      default:
        return SynchronousFuture<AppLocalizations>(AppLocalizationsEn());
    }
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}
