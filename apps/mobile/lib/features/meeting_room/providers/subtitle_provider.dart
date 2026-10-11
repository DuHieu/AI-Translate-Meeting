import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/websocket_client.dart';
import '../../../core/constants/app_config.dart';
import '../../../core/models/subtitle.dart';
import '../../../core/providers/app_providers.dart';
import '../../../core/utils/logger.dart';

class SubtitleState {
  const SubtitleState({
    this.buffer = const [],
    this.connectionState = WebSocketState.disconnected,
    this.errorMessage,
  });

  final List<Subtitle> buffer;
  final WebSocketState connectionState;
  final String? errorMessage;

  /// Latest 2–3 entries for the overlay (oldest → newest).
  List<Subtitle> get visible {
    if (buffer.isEmpty) return const [];
    final start = buffer.length > 3 ? buffer.length - 3 : 0;
    return buffer.sublist(start);
  }

  bool get isReconnecting =>
      connectionState == WebSocketState.reconnecting ||
      connectionState == WebSocketState.error;

  bool get hasFailed => connectionState == WebSocketState.failed;

  SubtitleState copyWith({
    List<Subtitle>? buffer,
    WebSocketState? connectionState,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SubtitleState(
      buffer: buffer ?? this.buffer,
      connectionState: connectionState ?? this.connectionState,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SubtitleNotifier extends AutoDisposeNotifier<SubtitleState> {
  SubtitleSocket get _client => ref.read(websocketClientProvider);

  StreamSubscription<Subtitle>? _subtitleSub;
  StreamSubscription<WebSocketState>? _stateSub;
  bool _started = false;

  @override
  SubtitleState build() {
    ref.watch(websocketClientProvider);
    ref.onDispose(() {
      unawaited(_subtitleSub?.cancel());
      unawaited(_stateSub?.cancel());
    });
    return const SubtitleState();
  }

  /// Connect to subtitle stream with [subtitleToken].
  Future<void> start({
    required String subtitleToken,
    String? wsUrl,
  }) async {
    if (_started) return;
    _started = true;

    final url = wsUrl ?? AppConfig.subtitleWsUrl;
    state = state.copyWith(
      connectionState: WebSocketState.connecting,
      clearError: true,
    );

    try {
      await _client.connect(url, subtitleToken);
      await _subtitleSub?.cancel();
      await _stateSub?.cancel();
      _subtitleSub = _client.subtitleStream.listen(_onSubtitle);
      _stateSub = _client.stateStream.listen(_onSocketState);
      state = state.copyWith(connectionState: _client.state);
    } catch (error, stackTrace) {
      AppLogger.e('Failed to start subtitle stream', error, stackTrace);
      _started = false;
      state = state.copyWith(
        connectionState: WebSocketState.failed,
        errorMessage: 'subtitle_connect_failed',
      );
    }
  }

  Future<void> stop() async {
    await _subtitleSub?.cancel();
    await _stateSub?.cancel();
    _subtitleSub = null;
    _stateSub = null;
    await _client.disconnect();
    _started = false;
    state = state.copyWith(
      connectionState: WebSocketState.disconnected,
      buffer: const [],
    );
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  void _onSocketState(WebSocketState socketState) {
    state = state.copyWith(
      connectionState: socketState,
      errorMessage: socketState == WebSocketState.failed
          ? 'subtitle_connect_failed'
          : null,
      clearError: socketState == WebSocketState.connected,
    );
  }

  void _onSubtitle(Subtitle subtitle) {
    final next = List<Subtitle>.from(state.buffer);

    final existingIndex = _findReplaceIndex(next, subtitle);
    if (existingIndex >= 0) {
      next[existingIndex] = subtitle;
    } else {
      next.add(subtitle);
    }

    while (next.length > AppConfig.maxSubtitleBuffer) {
      next.removeAt(0);
    }

    state = state.copyWith(buffer: next);
  }

  int _findReplaceIndex(List<Subtitle> buffer, Subtitle incoming) {
    if (buffer.isEmpty) return -1;

    if (incoming.messageId != null && incoming.messageId!.isNotEmpty) {
      final byId = buffer.lastIndexWhere(
        (item) => item.messageId == incoming.messageId,
      );
      if (byId >= 0) return byId;
    }

    final last = buffer.last;
    if (last.isPartial &&
        last.speaker == incoming.speaker &&
        last.speaker.isNotEmpty) {
      return buffer.length - 1;
    }

    return -1;
  }
}

final subtitleProvider =
    NotifierProvider.autoDispose<SubtitleNotifier, SubtitleState>(
  SubtitleNotifier.new,
);
