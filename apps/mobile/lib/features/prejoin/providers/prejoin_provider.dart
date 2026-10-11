import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/api/meeting_api.dart';
import '../../../core/constants/app_config.dart';
import '../../../core/models/meeting.dart';
import '../../../core/providers/app_providers.dart';
import '../../../core/utils/permission_service.dart';
import '../../../core/utils/secure_storage.dart';
import '../../../core/utils/validators.dart';

/// Permission permanently-denied signal for UI dialogs.
enum PermissionPrompt {
  none,
  camera,
  microphone,
  both,
}

class PrejoinState {
  const PrejoinState({
    this.displayName = '',
    this.spokenLanguage = AppConfig.defaultSpokenLanguage,
    this.targetLanguage = AppConfig.defaultTargetLanguage,
    this.isCameraEnabled = true,
    this.isMicEnabled = true,
    this.hasCameraPermission = false,
    this.hasMicPermission = false,
    this.isLoadingPreferences = false,
    this.isJoining = false,
    this.errorMessage,
    this.permissionPrompt = PermissionPrompt.none,
    this.joinResponse,
    this.micLevel = 0.0,
  });

  final String displayName;
  final String spokenLanguage;
  final String targetLanguage;
  final bool isCameraEnabled;
  final bool isMicEnabled;
  final bool hasCameraPermission;
  final bool hasMicPermission;
  final bool isLoadingPreferences;
  final bool isJoining;
  final String? errorMessage;
  final PermissionPrompt permissionPrompt;
  final JoinResponse? joinResponse;
  final double micLevel;

  bool get canShowCameraPreview => isCameraEnabled && hasCameraPermission;

  bool get canJoin =>
      Validators.isValidDisplayName(displayName) && !isJoining;

  PrejoinState copyWith({
    String? displayName,
    String? spokenLanguage,
    String? targetLanguage,
    bool? isCameraEnabled,
    bool? isMicEnabled,
    bool? hasCameraPermission,
    bool? hasMicPermission,
    bool? isLoadingPreferences,
    bool? isJoining,
    String? errorMessage,
    PermissionPrompt? permissionPrompt,
    JoinResponse? joinResponse,
    double? micLevel,
    bool clearError = false,
    bool clearJoinResponse = false,
    bool clearPermissionPrompt = false,
  }) {
    return PrejoinState(
      displayName: displayName ?? this.displayName,
      spokenLanguage: spokenLanguage ?? this.spokenLanguage,
      targetLanguage: targetLanguage ?? this.targetLanguage,
      isCameraEnabled: isCameraEnabled ?? this.isCameraEnabled,
      isMicEnabled: isMicEnabled ?? this.isMicEnabled,
      hasCameraPermission: hasCameraPermission ?? this.hasCameraPermission,
      hasMicPermission: hasMicPermission ?? this.hasMicPermission,
      isLoadingPreferences:
          isLoadingPreferences ?? this.isLoadingPreferences,
      isJoining: isJoining ?? this.isJoining,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      permissionPrompt: clearPermissionPrompt
          ? PermissionPrompt.none
          : (permissionPrompt ?? this.permissionPrompt),
      joinResponse:
          clearJoinResponse ? null : (joinResponse ?? this.joinResponse),
      micLevel: micLevel ?? this.micLevel,
    );
  }
}

class PrejoinNotifier extends Notifier<PrejoinState> {
  MeetingApi get _meetingApi => ref.read(meetingApiProvider);
  SecureStorage get _storage => ref.read(secureStorageProvider);
  PermissionService get _permissions => ref.read(permissionServiceProvider);

  @override
  PrejoinState build() {
    Future<void>.microtask(() async {
      await _bootstrap();
    });
    return const PrejoinState();
  }

  Future<void> _bootstrap() async {
    try {
      await restorePreferences();
      await refreshPermissions();
      _updateMockMicLevel();
    } catch (_) {
      // Never block prejoin UI on preference/permission failures.
    }
  }

  Future<void> restorePreferences() async {
    final displayName = await _storage.getDisplayName();
    final spoken = await _storage.getSpokenLanguage();
    final target = await _storage.getTargetLanguage();

    state = state.copyWith(
      displayName: displayName ?? '',
      spokenLanguage: spoken ?? AppConfig.defaultSpokenLanguage,
      targetLanguage: target ?? AppConfig.defaultTargetLanguage,
    );
  }

  void setDisplayName(String value) {
    state = state.copyWith(displayName: value, clearError: true);
  }

  void setSpokenLanguage(String value) {
    if (!Validators.isValidLanguageCode(value)) return;
    state = state.copyWith(spokenLanguage: value);
  }

  void setTargetLanguage(String value) {
    if (!Validators.isValidLanguageCode(value)) return;
    state = state.copyWith(targetLanguage: value);
  }

  Future<void> toggleCamera() async {
    final next = !state.isCameraEnabled;
    if (next) {
      final granted = await ensureCameraPermission();
      if (!granted) {
        state = state.copyWith(isCameraEnabled: false);
        return;
      }
    }
    state = state.copyWith(isCameraEnabled: next);
  }

  Future<void> toggleMic() async {
    final next = !state.isMicEnabled;
    if (next) {
      final granted = await ensureMicPermission();
      if (!granted) {
        state = state.copyWith(isMicEnabled: false, micLevel: 0);
        return;
      }
    }
    state = state.copyWith(
      isMicEnabled: next,
      micLevel: next ? state.micLevel : 0,
    );
    _updateMockMicLevel();
  }

  Future<void> refreshPermissions() async {
    final camera = await _permissions.status(Permission.camera);
    final mic = await _permissions.status(Permission.microphone);
    state = state.copyWith(
      hasCameraPermission: camera.isGranted,
      hasMicPermission: mic.isGranted,
    );
  }

  Future<bool> ensureCameraPermission() async {
    final status = await _permissions.request(Permission.camera);
    final granted = status.isGranted;
    state = state.copyWith(hasCameraPermission: granted);
    if (status.isPermanentlyDenied) {
      state = state.copyWith(
        permissionPrompt: state.permissionPrompt == PermissionPrompt.microphone
            ? PermissionPrompt.both
            : PermissionPrompt.camera,
      );
    }
    return granted;
  }

  Future<bool> ensureMicPermission() async {
    final status = await _permissions.request(Permission.microphone);
    final granted = status.isGranted;
    state = state.copyWith(hasMicPermission: granted);
    if (status.isPermanentlyDenied) {
      state = state.copyWith(
        permissionPrompt: state.permissionPrompt == PermissionPrompt.camera
            ? PermissionPrompt.both
            : PermissionPrompt.microphone,
      );
    }
    return granted;
  }

  Future<void> requestInitialPermissions() async {
    await ensureCameraPermission();
    await ensureMicPermission();
  }

  void clearPermissionPrompt() {
    state = state.copyWith(clearPermissionPrompt: true);
  }

  Future<void> openAppSettingsPage() async {
    await _permissions.openSettings();
    clearPermissionPrompt();
    await refreshPermissions();
  }

  /// Join meeting and persist successful preferences.
  Future<JoinResponse?> joinMeeting(String meetingCode) async {
    if (!Validators.isValidDisplayName(state.displayName)) {
      state = state.copyWith(errorMessage: 'display_name_required');
      return null;
    }

    state = state.copyWith(
      isJoining: true,
      clearError: true,
      clearJoinResponse: true,
    );

    try {
      final hostToken = await _storage.getHostToken();
      final response = await _meetingApi.joinMeeting(
        meetingCode,
        JoinRequest(
          displayName: state.displayName.trim(),
          spokenLanguage: state.spokenLanguage,
          targetLanguage: state.targetLanguage,
          admissionToken: hostToken,
        ),
      );

      await _storage.saveJoinPreferences(
        displayName: state.displayName.trim(),
        spokenLanguage: state.spokenLanguage,
        targetLanguage: state.targetLanguage,
      );
      await _storage.saveTokens(
        livekitToken: response.livekitToken,
        sessionToken: response.sessionToken,
        subtitleToken: response.subtitleToken,
      );
      await _storage.addRecentMeeting(
        RecentMeeting(
          meetingCode: Validators.normalizeMeetingCode(meetingCode),
          name: state.displayName.trim(),
          joinedAt: DateTime.now().toUtc(),
        ),
      );

      state = state.copyWith(
        isJoining: false,
        joinResponse: response,
        clearError: true,
      );
      return response;
    } catch (error) {
      final apiError = ApiErrorMapper.from(error);
      state = state.copyWith(
        isJoining: false,
        errorMessage: _mapErrorKey(apiError),
      );
      return null;
    }
  }

  void clearJoinResult() {
    state = state.copyWith(clearJoinResponse: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void _updateMockMicLevel() {
    if (!state.isMicEnabled || !state.hasMicPermission) {
      state = state.copyWith(micLevel: 0);
      return;
    }
    // Lightweight visual feedback until Task 5 wires real RMS metering.
    final next = 0.25 + (DateTime.now().millisecond % 50) / 100;
    state = state.copyWith(micLevel: next.clamp(0.0, 1.0));
  }

  String _mapErrorKey(ApiException error) {
    switch (error.statusCode) {
      case 404:
        return 'meeting_not_found';
      case 403:
        return 'meeting_ended';
      case 0:
        if (error.type == ApiExceptionType.network ||
            error.type == ApiExceptionType.timeout) {
          return 'network_error';
        }
        return 'unexpected_error';
      default:
        return 'unexpected_error';
    }
  }
}

final prejoinProvider =
    NotifierProvider<PrejoinNotifier, PrejoinState>(PrejoinNotifier.new);
