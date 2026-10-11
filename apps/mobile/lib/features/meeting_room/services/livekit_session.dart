import 'dart:async';

import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/utils/logger.dart';
import '../models/room_participant_view.dart';

enum NetworkQualityLevel { excellent, good, poor, unknown }

/// Thin session wrapper around LiveKit [lk.Room] for testability.
abstract class LiveKitSession {
  Stream<List<RoomParticipantView>> get participantsStream;
  Stream<lk.ConnectionState> get connectionStateStream;
  Stream<NetworkQualityLevel> get networkQualityStream;

  lk.ConnectionState get connectionState;
  List<RoomParticipantView> get participants;
  NetworkQualityLevel get networkQuality;

  Future<void> connect({
    required String url,
    required String token,
  });

  Future<void> publishInitialMedia({
    required bool cameraEnabled,
    required bool microphoneEnabled,
  });

  Future<void> setCameraEnabled(bool enabled);
  Future<void> setMicrophoneEnabled(bool enabled);
  Future<void> flipCamera();
  Future<void> setSpeakerOn(bool enabled);
  Future<void> setDegradedVideo(bool degraded);
  Future<void> reconnect();
  Future<void> disconnect();
  Future<void> dispose();
}

/// Production LiveKit session backed by [lk.Room].
class LiveKitRoomSession implements LiveKitSession {
  LiveKitRoomSession({lk.Room? room}) : _room = room ?? lk.Room();

  final lk.Room _room;
  lk.EventsListener<lk.RoomEvent>? _listener;
  final _participantsController =
      StreamController<List<RoomParticipantView>>.broadcast();
  final _connectionController =
      StreamController<lk.ConnectionState>.broadcast();
  final _qualityController = StreamController<NetworkQualityLevel>.broadcast();

  String? _url;
  String? _token;
  lk.CameraPosition _cameraPosition = lk.CameraPosition.front;
  NetworkQualityLevel _networkQuality = NetworkQualityLevel.unknown;

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
  lk.ConnectionState get connectionState => _room.connectionState;

  @override
  List<RoomParticipantView> get participants => _collectParticipants();

  @override
  NetworkQualityLevel get networkQuality => _networkQuality;

  @override
  Future<void> connect({
    required String url,
    required String token,
  }) async {
    _url = url;
    _token = token;
    _listener?.dispose();
    _listener = _room.createListener();
    _listener!
      ..on<lk.RoomConnectedEvent>((_) {
        _setQuality(NetworkQualityLevel.good);
        _emitAll();
      })
      ..on<lk.RoomDisconnectedEvent>((_) => _emitAll())
      ..on<lk.RoomReconnectingEvent>((_) {
        _setQuality(NetworkQualityLevel.poor);
        _emitAll();
      })
      ..on<lk.RoomReconnectedEvent>((_) {
        _setQuality(NetworkQualityLevel.good);
        _emitAll();
      })
      ..on<lk.ParticipantConnectedEvent>((_) => _emitParticipants())
      ..on<lk.ParticipantDisconnectedEvent>((_) => _emitParticipants())
      ..on<lk.TrackSubscribedEvent>((_) => _emitParticipants())
      ..on<lk.TrackUnsubscribedEvent>((_) => _emitParticipants())
      ..on<lk.TrackMutedEvent>((_) => _emitParticipants())
      ..on<lk.TrackUnmutedEvent>((_) => _emitParticipants())
      ..on<lk.LocalTrackPublishedEvent>((_) => _emitParticipants())
      ..on<lk.LocalTrackUnpublishedEvent>((_) => _emitParticipants())
      ..on<lk.ActiveSpeakersChangedEvent>((_) => _emitParticipants());

    AppLogger.i('Connecting to LiveKit room');
    await _room.connect(url, token);
    _setQuality(NetworkQualityLevel.good);
    _emitAll();
  }

  @override
  Future<void> publishInitialMedia({
    required bool cameraEnabled,
    required bool microphoneEnabled,
  }) async {
    final local = _room.localParticipant;
    if (local == null) {
      throw StateError('Cannot publish media before local participant exists');
    }

    if (cameraEnabled) {
      AppLogger.d('Publishing camera track');
      await local.setCameraEnabled(true);
      _emitParticipants();
    }

    if (microphoneEnabled) {
      AppLogger.d('Publishing microphone track');
      await local.setMicrophoneEnabled(true);
      _emitParticipants();
    }
  }

  @override
  Future<void> setCameraEnabled(bool enabled) async {
    final local = _room.localParticipant;
    if (local == null) return;
    await local.setCameraEnabled(enabled);
    _emitParticipants();
  }

  @override
  Future<void> setMicrophoneEnabled(bool enabled) async {
    final local = _room.localParticipant;
    if (local == null) return;
    await local.setMicrophoneEnabled(enabled);
    _emitParticipants();
  }

  @override
  Future<void> flipCamera() async {
    final local = _room.localParticipant;
    if (local == null) return;
    lk.LocalVideoTrack? track;
    for (final pub in local.videoTrackPublications) {
      if (pub.source == lk.TrackSource.camera &&
          pub.track is lk.LocalVideoTrack) {
        track = pub.track as lk.LocalVideoTrack;
        break;
      }
    }
    if (track == null) {
      throw StateError('No local camera track to flip');
    }
    final next = _cameraPosition == lk.CameraPosition.front
        ? lk.CameraPosition.back
        : lk.CameraPosition.front;
    await track.setCameraPosition(next);
    _cameraPosition = next;
    _emitParticipants();
  }

  @override
  Future<void> setSpeakerOn(bool enabled) async {
    // Deprecated API still present on livekit_client 2.3.x.
    await _room.setSpeakerOn(enabled, forceSpeakerOutput: enabled);
  }

  @override
  Future<void> setDegradedVideo(bool degraded) async {
    // MVP degradation: turn camera off on poor network to preserve audio.
    final local = _room.localParticipant;
    if (local == null) return;
    if (degraded && local.isCameraEnabled()) {
      await local.setCameraEnabled(false);
      _emitParticipants();
    }
  }

  @override
  Future<void> reconnect() async {
    final url = _url;
    final token = _token;
    if (url == null || token == null) {
      throw StateError('Cannot reconnect without prior connection params');
    }
    await _room.disconnect();
    await _room.connect(url, token);
    _emitAll();
  }

  @override
  Future<void> disconnect() async {
    AppLogger.i('Disconnecting from LiveKit room');
    await _room.disconnect();
    _emitAll();
  }

  @override
  Future<void> dispose() async {
    _listener?.dispose();
    _listener = null;
    await _room.disconnect();
    await _room.dispose();
    await _participantsController.close();
    await _connectionController.close();
    await _qualityController.close();
  }

  void _setQuality(NetworkQualityLevel level) {
    _networkQuality = level;
    if (!_qualityController.isClosed) {
      _qualityController.add(level);
    }
  }

  void _emitAll() {
    _emitConnection();
    _emitParticipants();
  }

  void _emitConnection() {
    if (!_connectionController.isClosed) {
      _connectionController.add(_room.connectionState);
    }
  }

  void _emitParticipants() {
    if (!_participantsController.isClosed) {
      _participantsController.add(_collectParticipants());
    }
  }

  List<RoomParticipantView> _collectParticipants() {
    final views = <RoomParticipantView>[];
    final local = _room.localParticipant;
    if (local != null) {
      views.add(_mapParticipant(local, isLocal: true));
    }
    for (final remote in _room.remoteParticipants.values) {
      views.add(_mapParticipant(remote, isLocal: false));
    }
    return views;
  }

  RoomParticipantView _mapParticipant(
    lk.Participant participant, {
    required bool isLocal,
  }) {
    final cameraPub =
        participant.getTrackPublicationBySource(lk.TrackSource.camera);
    final micPub =
        participant.getTrackPublicationBySource(lk.TrackSource.microphone);
    final videoTrack = cameraPub?.track;
    final resolvedVideo =
        videoTrack is lk.VideoTrack && !(cameraPub?.muted ?? true)
            ? videoTrack
            : null;

    return RoomParticipantView(
      sid: participant.sid,
      identity: participant.identity,
      displayName:
          participant.name.isNotEmpty ? participant.name : participant.identity,
      isLocal: isLocal,
      isMicMuted: micPub?.muted ?? true,
      isCameraEnabled: cameraPub != null && !(cameraPub.muted),
      isSpeaking: participant.isSpeaking,
      videoTrack: resolvedVideo,
    );
  }
}

/// In-memory session used by unit tests (no native WebRTC).
class FakeLiveKitSession implements LiveKitSession {
  FakeLiveKitSession({
    this.participants = const [],
    this.connectionState = lk.ConnectionState.disconnected,
    this.networkQuality = NetworkQualityLevel.unknown,
  });

  @override
  List<RoomParticipantView> participants;

  @override
  lk.ConnectionState connectionState;

  @override
  NetworkQualityLevel networkQuality;

  final List<String> publishOrder = [];
  bool connectCalled = false;
  bool disconnectCalled = false;
  bool reconnectCalled = false;
  Object? connectError;
  Object? publishError;

  final _participantsController =
      StreamController<List<RoomParticipantView>>.broadcast();
  final _connectionController =
      StreamController<lk.ConnectionState>.broadcast();
  final _qualityController = StreamController<NetworkQualityLevel>.broadcast();

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
  Future<void> connect({
    required String url,
    required String token,
  }) async {
    if (connectError != null) throw connectError!;
    connectCalled = true;
    connectionState = lk.ConnectionState.connected;
    _connectionController.add(connectionState);
    _participantsController.add(participants);
  }

  @override
  Future<void> publishInitialMedia({
    required bool cameraEnabled,
    required bool microphoneEnabled,
  }) async {
    if (publishError != null) throw publishError!;
    if (cameraEnabled) publishOrder.add('camera');
    if (microphoneEnabled) publishOrder.add('microphone');
    participants = participants
        .map(
          (p) => p.isLocal
              ? p.copyWith(
                  isCameraEnabled: cameraEnabled,
                  isMicMuted: !microphoneEnabled,
                )
              : p,
        )
        .toList();
    _participantsController.add(participants);
  }

  @override
  Future<void> setCameraEnabled(bool enabled) async {
    publishOrder.add(enabled ? 'camera_on' : 'camera_off');
    participants = participants
        .map((p) => p.isLocal ? p.copyWith(isCameraEnabled: enabled) : p)
        .toList();
    _participantsController.add(participants);
  }

  @override
  Future<void> setMicrophoneEnabled(bool enabled) async {
    publishOrder.add(enabled ? 'mic_on' : 'mic_off');
    participants = participants
        .map((p) => p.isLocal ? p.copyWith(isMicMuted: !enabled) : p)
        .toList();
    _participantsController.add(participants);
  }

  @override
  Future<void> flipCamera() async {
    publishOrder.add('flip');
  }

  @override
  Future<void> setSpeakerOn(bool enabled) async {
    publishOrder.add(enabled ? 'speaker_on' : 'speaker_off');
  }

  @override
  Future<void> setDegradedVideo(bool degraded) async {
    publishOrder.add(degraded ? 'degrade_on' : 'degrade_off');
    if (degraded) {
      await setCameraEnabled(false);
    }
  }

  @override
  Future<void> reconnect() async {
    reconnectCalled = true;
    connectionState = lk.ConnectionState.connected;
    _connectionController.add(connectionState);
  }

  void emitQuality(NetworkQualityLevel level) {
    networkQuality = level;
    _qualityController.add(level);
  }

  void emitConnection(lk.ConnectionState state) {
    connectionState = state;
    _connectionController.add(state);
  }

  @override
  Future<void> disconnect() async {
    disconnectCalled = true;
    connectionState = lk.ConnectionState.disconnected;
    _connectionController.add(connectionState);
  }

  @override
  Future<void> dispose() async {
    await _participantsController.close();
    await _connectionController.close();
    await _qualityController.close();
  }
}
