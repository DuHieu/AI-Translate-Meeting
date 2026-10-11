import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/meeting_api.dart';
import '../api/websocket_client.dart';
import '../constants/app_config.dart';
import '../utils/permission_service.dart';
import '../utils/secure_storage.dart';

/// Provider for secure storage
final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

/// Provider for camera/microphone permission helpers
final permissionServiceProvider = Provider<PermissionService>((ref) {
  return PermissionService();
});

/// Provider for API client
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    secureStorage: ref.watch(secureStorageProvider),
  );
});

/// Provider for meeting API
final meetingApiProvider = Provider<MeetingApi>((ref) {
  return MeetingApi(ref.watch(apiClientProvider));
});

/// Provider for subtitle realtime socket
final websocketClientProvider = Provider<SubtitleSocket>((ref) {
  final client = WebSocketClient();
  ref.onDispose(client.dispose);
  return client;
});

/// Provider for checking API health
final apiHealthProvider = FutureProvider<bool>((ref) async {
  final meetingApi = ref.watch(meetingApiProvider);
  return await meetingApi.checkHealth();
});
