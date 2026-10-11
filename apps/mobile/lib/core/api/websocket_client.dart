import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../constants/app_config.dart';
import '../models/subtitle.dart';
import '../utils/logger.dart';

typedef WebSocketConnector = WebSocketChannel Function(Uri uri);

/// Contract for subtitle realtime transport.
abstract class SubtitleSocket {
  Stream<Subtitle> get subtitleStream;
  Stream<WebSocketState> get stateStream;
  WebSocketState get state;
  bool get isConnected;

  Future<void> connect(String wsUrl, String token);
  Future<void> disconnect();
  void dispose();
}

/// WebSocket client for real-time subtitle streaming
class WebSocketClient implements SubtitleSocket {
  WebSocketClient({WebSocketConnector? connector})
      : _connector = connector ?? WebSocketChannel.connect;

  final WebSocketConnector _connector;

  WebSocketChannel? _channel;
  StreamController<Subtitle>? _subtitleController;
  StreamController<WebSocketState>? _stateController;

  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  String? _lastUrl;
  bool _manualClose = false;
  StreamSubscription<dynamic>? _channelSub;

  @override
  Stream<Subtitle> get subtitleStream =>
      _subtitleController?.stream ?? const Stream.empty();

  @override
  Stream<WebSocketState> get stateStream =>
      _stateController?.stream ?? const Stream.empty();

  WebSocketState _state = WebSocketState.disconnected;

  @override
  WebSocketState get state => _state;

  @override
  Future<void> connect(String wsUrl, String token) async {
    if (_channel != null || _reconnectTimer != null) {
      AppLogger.w('WebSocket already active, disconnecting first');
      await disconnect();
    }

    _manualClose = false;
    final separator = wsUrl.contains('?') ? '&' : '?';
    _lastUrl = '$wsUrl${separator}token=${Uri.encodeQueryComponent(token)}';

    _subtitleController = StreamController<Subtitle>.broadcast();
    _stateController = StreamController<WebSocketState>.broadcast();

    _reconnectAttempts = 0;
    await _connect();
  }

  Future<void> _connect() async {
    if (_lastUrl == null) {
      AppLogger.e('Cannot connect: URL not set');
      return;
    }

    try {
      _updateState(WebSocketState.connecting);
      AppLogger.d('Connecting to WebSocket');

      await _channelSub?.cancel();
      await _channel?.sink.close();

      _channel = _connector(Uri.parse(_lastUrl!));

      _updateState(WebSocketState.connected);
      _reconnectAttempts = 0;
      AppLogger.d('WebSocket connected successfully');

      _channelSub = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDone,
        cancelOnError: false,
      );
    } catch (e, stackTrace) {
      AppLogger.e('WebSocket connection failed', e, stackTrace);
      _updateState(WebSocketState.error);
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final raw = message is String ? message : message.toString();
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final subtitleMessage = SubtitleMessage.fromJson(json);

      if (subtitleMessage.type == 'subtitle' &&
          subtitleMessage.subtitle != null) {
        _subtitleController?.add(subtitleMessage.subtitle!);
        AppLogger.v(
          'Received subtitle: ${subtitleMessage.subtitle!.sourceText}',
        );
      } else if (subtitleMessage.type == 'error') {
        AppLogger.e('Subtitle error: ${subtitleMessage.error}');
      }
    } catch (e, stackTrace) {
      AppLogger.e('Failed to parse subtitle message', e, stackTrace);
    }
  }

  void _handleError(dynamic error) {
    AppLogger.e('WebSocket error', error);
    _updateState(WebSocketState.error);

    if (!_manualClose) {
      _scheduleReconnect();
    }
  }

  void _handleDone() {
    AppLogger.d('WebSocket connection closed');
    _updateState(WebSocketState.disconnected);

    if (!_manualClose) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_manualClose) {
      AppLogger.d('Manual close, not reconnecting');
      return;
    }

    if (_reconnectAttempts >= AppConfig.wsReconnectMaxAttempts) {
      AppLogger.e(
        'Max reconnect attempts reached (${AppConfig.wsReconnectMaxAttempts})',
      );
      _updateState(WebSocketState.failed);
      return;
    }

    _reconnectAttempts++;

    final delaySeconds = min(
      pow(2, _reconnectAttempts - 1).toInt(),
      AppConfig.wsReconnectMaxDelay.inSeconds,
    );
    final delay = Duration(seconds: delaySeconds);

    AppLogger.d(
      'Scheduling reconnect attempt $_reconnectAttempts in ${delay.inSeconds}s',
    );
    _updateState(WebSocketState.reconnecting);

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      if (!_manualClose) {
        _connect();
      }
    });
  }

  void _updateState(WebSocketState newState) {
    if (_state != newState) {
      _state = newState;
      if (_stateController != null && !_stateController!.isClosed) {
        _stateController!.add(newState);
      }
      AppLogger.d('WebSocket state changed: $newState');
    }
  }

  void send(Map<String, dynamic> message) {
    if (_channel == null || _state != WebSocketState.connected) {
      AppLogger.w('Cannot send message: not connected');
      return;
    }

    try {
      _channel!.sink.add(jsonEncode(message));
    } catch (e, stackTrace) {
      AppLogger.e('Failed to send message', e, stackTrace);
    }
  }

  @override
  Future<void> disconnect() async {
    AppLogger.d('Disconnecting WebSocket');
    _manualClose = true;

    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    await _channelSub?.cancel();
    _channelSub = null;

    await _channel?.sink.close();
    _channel = null;

    await _subtitleController?.close();
    await _stateController?.close();

    _subtitleController = null;
    _stateController = null;

    _updateState(WebSocketState.disconnected);
    _lastUrl = null;
  }

  @override
  bool get isConnected => _state == WebSocketState.connected;

  @override
  void dispose() {
    unawaited(disconnect());
  }
}

/// In-memory socket for unit tests.
class FakeSubtitleSocket implements SubtitleSocket {
  final _subtitleController = StreamController<Subtitle>.broadcast();
  final _stateController = StreamController<WebSocketState>.broadcast();

  WebSocketState _state = WebSocketState.disconnected;
  Object? connectError;
  bool connectCalled = false;
  bool disconnectCalled = false;
  String? lastUrl;
  String? lastToken;

  @override
  Stream<Subtitle> get subtitleStream => _subtitleController.stream;

  @override
  Stream<WebSocketState> get stateStream => _stateController.stream;

  @override
  WebSocketState get state => _state;

  @override
  bool get isConnected => _state == WebSocketState.connected;

  @override
  Future<void> connect(String wsUrl, String token) async {
    connectCalled = true;
    lastUrl = wsUrl;
    lastToken = token;
    if (connectError != null) throw connectError!;
    _setState(WebSocketState.connected);
  }

  void emit(Subtitle subtitle) => _subtitleController.add(subtitle);

  void emitState(WebSocketState state) => _setState(state);

  void _setState(WebSocketState next) {
    _state = next;
    _stateController.add(next);
  }

  @override
  Future<void> disconnect() async {
    disconnectCalled = true;
    _setState(WebSocketState.disconnected);
  }

  @override
  void dispose() {
    unawaited(_subtitleController.close());
    unawaited(_stateController.close());
  }
}

enum WebSocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
  failed,
}
