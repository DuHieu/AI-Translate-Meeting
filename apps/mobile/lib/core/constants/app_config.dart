/// Application configuration and constants
class AppConfig {
  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000', // Android emulator localhost
  );

  static const String livekitUrl = String.fromEnvironment(
    'LIVEKIT_URL',
    defaultValue: 'ws://10.0.2.2:7880',
  );

  static const String subtitleWsUrl = String.fromEnvironment(
    'SUBTITLE_WS_URL',
    defaultValue: 'ws://10.0.2.2:8000/ws/transcribe',
  );

  // App Configuration
  static const String appName = 'Laya Meet';
  static const String appVersion = '1.0.0';

  // Meeting Configuration
  static const int meetingCodeLength = 6;
  static const int maxParticipants = 10;

  // WebSocket Configuration
  static const int wsReconnectMaxAttempts = 10;
  static const Duration wsReconnectInitialDelay = Duration(seconds: 1);
  static const Duration wsReconnectMaxDelay = Duration(seconds: 10);

  // Video Configuration
  static const int videoQualityHigh = 720;
  static const int videoQualityMedium = 480;
  static const int videoQualityLow = 360;

  // Subtitle Configuration
  static const int maxSubtitleBuffer = 50;
  static const Duration subtitleDisplayDuration = Duration(seconds: 5);

  // Language Configuration
  static const List<String> supportedLanguages = ['vi', 'ja', 'en'];
  static const String defaultSpokenLanguage = 'vi';
  static const String defaultTargetLanguage = 'en';
  static const int maxRecentMeetings = 8;

  // Network Configuration
  static const Duration httpConnectTimeout = Duration(seconds: 10);
  static const Duration httpReceiveTimeout = Duration(seconds: 10);

  // Storage Keys
  static const String keyLivekitToken = 'livekit_token';
  static const String keySessionToken = 'session_token';
  static const String keySubtitleToken = 'subtitle_token';
  static const String keyUserPreferences = 'user_preferences';
  static const String keySpokenLanguage = 'spoken_language';
  static const String keyTargetLanguage = 'target_language';
  static const String keyDisplayName = 'display_name';
  static const String keyRecentMeetings = 'recent_meetings';
  static const String keyHostToken = 'host_token';

  // Prevent instantiation
  AppConfig._();
}
