import 'dart:async';

import 'package:livekit_client/livekit_client.dart' as lk;
import 'package:mobile/features/meeting_room/models/room_participant_view.dart';
import 'package:mobile/features/meeting_room/services/livekit_session.dart';

/// Deterministic LiveKit session for E2E / widget tests (no real WebRTC).
class FakeLiveKitSession implements LiveKitSession {
  FakeLiveKitSession({this.localIdentity = 'local-e2e'});

  final String localIdentity;

  final _participantsController =
      StreamController<List<RoomParticipantView>>.broadcast();
  final _connectionController =
      StreamController<lk.ConnectionState>.broadcast();
  final _qualityController =
      StreamController<NetworkQualityLevel>.broadcast();

  lk.ConnectionState _connectionState = lk.ConnectionState.disconnected;
  NetworkQualityLevel _networkQuality = NetworkQualityLevel.excellent;
  final List<RoomParticipantView> _participants = [];

  @override
  Stream<List<RoomParticipantView>> get participantsStream =>
      _participantsController.stream;

  @override
  Stream<lk.ConnectionState> get connectionStateStream =>
      _connectionController.stream;

  @override
  Stream<NetworkQualityLevel> get networkQualityStream =>
      _qualityController.stream;

  @override
  lk.ConnectionState get connectionState => _connectionState;

  @override
  List<RoomParticipantView> get participants => List.unmodifiable(_participants);

  @override
  NetworkQualityLevel get networkQuality => _networkQuality;

  RoomParticipantView _local({
    required bool cameraEnabled,
    required bool micEnabled,
  }) {
    return RoomParticipantView(
      sid: 'local',
      identity: localIdentity,
      displayName: 'You',
      isLocal: true,
      isMicMuted: !micEnabled,
      isCameraEnabled: cameraEnabled,
      isSpeaking: false,
    );
  }

  @override
  Future<void> connect({required String url, required String token}) async {
    _connectionState = lk.ConnectionState.connected;
    _connectionController.add(_connectionState);
    _participants
      ..clear()
      ..add(_local(cameraEnabled: true, micEnabled: true));
    _participantsController.add(participants);
    _qualityController.add(_networkQuality);
  }

  @override
  Future<void> publishInitialMedia({
    required bool cameraEnabled,
    required bool microphoneEnabled,
  }) async {
    _participants
      ..clear()
      ..add(
        _local(cameraEnabled: cameraEnabled, micEnabled: microphoneEnabled),
      );
    _participantsController.add(participants);
  }

  @override
  Future<void> setCameraEnabled(bool enabled) async {
    final micOn =
        _participants.isEmpty ? true : !_participants.first.isMicMuted;
    await publishInitialMedia(
      cameraEnabled: enabled,
      microphoneEnabled: micOn,
    );
  }

  @override
  Future<void> setMicrophoneEnabled(bool enabled) async {
    final camOn =
        _participants.isEmpty ? true : _participants.first.isCameraEnabled;
    await publishInitialMedia(
      cameraEnabled: camOn,
      microphoneEnabled: enabled,
    );
  }

  @override
  Future<void> flipCamera() async {}

  @override
  Future<void> setSpeakerOn(bool enabled) async {}

  @override
  Future<void> setDegradedVideo(bool degraded) async {}

  @override
  Future<void> reconnect() async {
    _connectionState = lk.ConnectionState.connected;
    _connectionController.add(_connectionState);
  }

  @override
  Future<void> disconnect() async {
    _connectionState = lk.ConnectionState.disconnected;
    _connectionController.add(_connectionState);
    _participants.clear();
    _participantsController.add(participants);
  }

  @override
  Future<void> dispose() async {
    await disconnect();
    await _participantsController.close();
    await _connectionController.close();
    await _qualityController.close();
  }
}
