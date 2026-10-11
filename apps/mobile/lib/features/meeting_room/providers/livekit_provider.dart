import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/api/meeting_api.dart';
import '../../../core/providers/app_providers.dart';
import '../../../core/utils/logger.dart';
import '../../../core/utils/secure_storage.dart';
import '../models/room_participant_view.dart';
import '../services/livekit_session.dart';

enum LiveKitStatus {
  idle,
  connecting,
  connected,
  reconnecting,
  failed,
  disconnected,
}

class LiveKitState {
  const LiveKitState({
    this.status = LiveKitStatus.idle,
    this.participants = const [],
    this.isCameraEnabled = true,
    this.isMicEnabled = true,
    this.isSpeakerOn = true,
    this.isPublishing = false,
    this.isLeaving = false,
    this.isVideoDegraded = false,
    this.networkQuality = NetworkQualityLevel.unknown,
    this.reconnectAttempts = 0,
    this.errorMessage,
    this.infoMessage,
  });

  final LiveKitStatus status;
  final List<RoomParticipantView> participants;
  final bool isCameraEnabled;
  final bool isMicEnabled;
  final bool isSpeakerOn;
  final bool isPublishing;
  final bool isLeaving;
  final bool isVideoDegraded;
  final NetworkQualityLevel networkQuality;
  final int reconnectAttempts;
  final String? errorMessage;
  final String? infoMessage;

  bool get isConnected => status == LiveKitStatus.connected;

  LiveKitState copyWith({
    LiveKitStatus? status,
    List<RoomParticipantView>? participants,
    bool? isCameraEnabled,
    bool? isMicEnabled,
    bool? isSpeakerOn,
    bool? isPublishing,
    bool? isLeaving,
    bool? isVideoDegraded,
    NetworkQualityLevel? networkQuality,
    int? reconnectAttempts,
    String? errorMessage,
    String? infoMessage,
    bool clearError = false,
    bool clearInfo = false,
  }) {
    return LiveKitState(
      status: status ?? this.status,
      participants: participants ?? this.participants,
      isCameraEnabled: isCameraEnabled ?? this.isCameraEnabled,
      isMicEnabled: isMicEnabled ?? this.isMicEnabled,
      isSpeakerOn: isSpeakerOn ?? this.isSpeakerOn,
      isPublishing: isPublishing ?? this.isPublishing,
      isLeaving: isLeaving ?? this.isLeaving,
      isVideoDegraded: isVideoDegraded ?? this.isVideoDegraded,
      networkQuality: networkQuality ?? this.networkQuality,
      reconnectAttempts: reconnectAttempts ?? this.reconnectAttempts,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      infoMessage: clearInfo ? null : (infoMessage ?? this.infoMessage),
    );
  }
}

final liveKitSessionProvider = Provider.autoDispose<LiveKitSession>((ref) {
  final session = LiveKitRoomSession();
  ref.onDispose(() {
    unawaited(session.dispose());
  });
  return session;
});

class LiveKitNotifier extends AutoDisposeNotifier<LiveKitState> {
  static const maxReconnectAttempts = 3;

  LiveKitSession get _session => ref.read(liveKitSessionProvider);
  MeetingApi get _meetingApi => ref.read(meetingApiProvider);
  SecureStorage get _storage => ref.read(secureStorageProvider);

  StreamSubscription<List<RoomParticipantView>>? _participantsSub;
  StreamSubscription<lk.ConnectionState>? _connectionSub;
  StreamSubscription<NetworkQualityLevel>? _qualitySub;

  String? _meetingCode;
  String? _participantId;
  bool _started = false;
  bool _intentionalLeave = false;
  bool _isReconnecting = false;

  @override
  LiveKitState build() {
    ref.watch(liveKitSessionProvider);
    ref.onDispose(() {
      unawaited(_participantsSub?.cancel());
      unawaited(_connectionSub?.cancel());
      unawaited(_qualitySub?.cancel());
    });
    return const LiveKitState();
  }

  Future<void> start({
    required String livekitUrl,
    required String livekitToken,
    required String meetingCode,
    required String participantId,
    required bool cameraEnabled,
    required bool micEnabled,
  }) async {
    if (_started) return;
    _started = true;
    _intentionalLeave = false;
    _meetingCode = meetingCode;
    _participantId = participantId;

    state = state.copyWith(
      status: LiveKitStatus.connecting,
      isCameraEnabled: cameraEnabled,
      isMicEnabled: micEnabled,
      clearError: true,
      clearInfo: true,
    );

    _participantsSub = _session.participantsStream.listen((participants) {
      state = state.copyWith(participants: participants);
    });
    _connectionSub = _session.connectionStateStream.listen(_onConnectionState);
    _qualitySub = _session.networkQualityStream.listen(_onNetworkQuality);

    try {
      await _session.connect(url: livekitUrl, token: livekitToken);
      state = state.copyWith(
        status: LiveKitStatus.connected,
        participants: _session.participants,
        isPublishing: true,
      );

      await _session.publishInitialMedia(
        cameraEnabled: cameraEnabled,
        microphoneEnabled: micEnabled,
      );
      await _session.setSpeakerOn(true);

      state = state.copyWith(
        isPublishing: false,
        isSpeakerOn: true,
        participants: _session.participants,
        clearError: true,
      );
    } catch (error, stackTrace) {
      AppLogger.e('Failed to start LiveKit session', error, stackTrace);
      state = state.copyWith(
        status: LiveKitStatus.failed,
        isPublishing: false,
        errorMessage: 'livekit_connect_failed',
      );
    }
  }

  Future<void> toggleCamera() async {
    final next = !state.isCameraEnabled;
    try {
      await _session.setCameraEnabled(next);
      state = state.copyWith(
        isCameraEnabled: next,
        isVideoDegraded: next ? false : state.isVideoDegraded,
        participants: _session.participants,
      );
    } catch (error, stackTrace) {
      AppLogger.e('Failed to toggle camera', error, stackTrace);
      state = state.copyWith(errorMessage: 'camera_toggle_failed');
    }
  }

  Future<void> toggleMic() async {
    final next = !state.isMicEnabled;
    try {
      await _session.setMicrophoneEnabled(next);
      state = state.copyWith(
        isMicEnabled: next,
        participants: _session.participants,
      );
    } catch (error, stackTrace) {
      AppLogger.e('Failed to toggle microphone', error, stackTrace);
      state = state.copyWith(errorMessage: 'mic_toggle_failed');
    }
  }

  Future<void> flipCamera() async {
    try {
      await _session.flipCamera();
      state = state.copyWith(
        participants: _session.participants,
        infoMessage: 'camera_flipped',
      );
    } catch (error, stackTrace) {
      AppLogger.e('Failed to flip camera', error, stackTrace);
      state = state.copyWith(errorMessage: 'camera_flip_failed');
    }
  }

  Future<void> toggleSpeaker() async {
    final next = !state.isSpeakerOn;
    try {
      await _session.setSpeakerOn(next);
      state = state.copyWith(isSpeakerOn: next);
    } catch (error, stackTrace) {
      AppLogger.e('Failed to toggle speaker', error, stackTrace);
      state = state.copyWith(errorMessage: 'speaker_toggle_failed');
    }
  }

  Future<void> leave() async {
    if (state.isLeaving) return;
    _intentionalLeave = true;
    state = state.copyWith(isLeaving: true);

    final code = _meetingCode;
    final participantId = _participantId;
    if (code != null && participantId != null && participantId.isNotEmpty) {
      try {
        await _meetingApi.leaveMeeting(code, participantId: participantId);
      } catch (error, stackTrace) {
        AppLogger.w('Leave API failed (continuing disconnect)', error);
        AppLogger.d('$stackTrace');
      }
    }

    try {
      await _session.disconnect();
    } catch (error, stackTrace) {
      AppLogger.e('LiveKit disconnect failed', error, stackTrace);
    }

    try {
      await _storage.clearTokens();
    } catch (error, stackTrace) {
      AppLogger.w('Failed to clear tokens', error);
      AppLogger.d('$stackTrace');
    }

    state = state.copyWith(
      status: LiveKitStatus.disconnected,
      isLeaving: false,
      participants: const [],
    );
  }

  void clearError() => state = state.copyWith(clearError: true);
  void clearInfo() => state = state.copyWith(clearInfo: true);

  Future<void> _onConnectionState(lk.ConnectionState connectionState) async {
    switch (connectionState) {
      case lk.ConnectionState.connecting:
        state = state.copyWith(status: LiveKitStatus.connecting);
      case lk.ConnectionState.connected:
        state = state.copyWith(
          status: LiveKitStatus.connected,
          reconnectAttempts: 0,
          infoMessage: state.reconnectAttempts > 0 ? 'network_restored' : null,
        );
      case lk.ConnectionState.reconnecting:
        state = state.copyWith(
          status: LiveKitStatus.reconnecting,
          infoMessage: 'network_reconnecting',
        );
      case lk.ConnectionState.disconnected:
        if (_intentionalLeave || state.status == LiveKitStatus.failed) {
          if (!_intentionalLeave) {
            state = state.copyWith(status: LiveKitStatus.disconnected);
          }
          return;
        }
        await _tryReconnect();
    }
  }

  Future<void> _tryReconnect() async {
    if (_isReconnecting || _intentionalLeave) return;
    if (state.reconnectAttempts >= maxReconnectAttempts) {
      state = state.copyWith(
        status: LiveKitStatus.failed,
        errorMessage: 'network_reconnect_failed',
      );
      return;
    }

    _isReconnecting = true;
    final attempt = state.reconnectAttempts + 1;
    state = state.copyWith(
      status: LiveKitStatus.reconnecting,
      reconnectAttempts: attempt,
      infoMessage: 'network_reconnecting',
    );

    try {
      await _session.reconnect();
      state = state.copyWith(
        status: LiveKitStatus.connected,
        infoMessage: 'network_restored',
        clearError: true,
      );
    } catch (error, stackTrace) {
      AppLogger.e('LiveKit reconnect failed', error, stackTrace);
      if (attempt >= maxReconnectAttempts) {
        state = state.copyWith(
          status: LiveKitStatus.failed,
          errorMessage: 'network_reconnect_failed',
        );
      }
    } finally {
      _isReconnecting = false;
    }
  }

  Future<void> _onNetworkQuality(NetworkQualityLevel quality) async {
    state = state.copyWith(networkQuality: quality);
    if (quality == NetworkQualityLevel.poor &&
        state.isCameraEnabled &&
        !state.isVideoDegraded) {
      try {
        await _session.setDegradedVideo(true);
        state = state.copyWith(
          isCameraEnabled: false,
          isVideoDegraded: true,
          infoMessage: 'video_degraded',
          participants: _session.participants,
        );
      } catch (error, stackTrace) {
        AppLogger.w('Failed to degrade video', error);
        AppLogger.d('$stackTrace');
      }
    }
  }
}

final liveKitProvider =
    NotifierProvider.autoDispose<LiveKitNotifier, LiveKitState>(
  LiveKitNotifier.new,
);
