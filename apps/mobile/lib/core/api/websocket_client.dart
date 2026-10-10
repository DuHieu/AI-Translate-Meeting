import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../constants/app_config.dart';
import '../models/subtitle.dart';
import '../utils/logger.dart';

/// WebSocket client for real-time subtitle streaming
class WebSocketClient {
  WebSocketChannel? _channel;
  StreamController<Subtitle>? _subtitleController;
  StreamController<WebSocketState>? _stateController;

  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  String? _lastUrl;
  bool _manualClose = false;

  /// Stream of subtitle messages
  Stream<Subtitle> get subtitleStream =>
      _subtitleController?.stream ?? const Stream.empty();

  /// Stream of connection state changes
  Stream<WebSocketState> get stateStream =>
      _stateController?.stream ?? const Stream.empty();

  /// Current connection state
  WebSocketState _state = WebSocketState.disconnected;
  WebSocketState get state => _state;

  /// Connect to subtitle WebSocket endpoint
  Future<void> connect(String wsUrl, String token) async {
    if (_channel != null) {
      AppLogger.w('WebSocket already connected, disconnecting first');
      await disconnect();
    }

    _manualClose = false;
    _lastUrl = '$wsUrl?token=$token';

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
      AppLogger.d('Connecting to WebSocket: $_lastUrl');

      _channel = WebSocketChannel.connect(Uri.parse(_lastUrl!));

      _updateState(WebSocketState.connected);
      _reconnectAttempts = 0;
      AppLogger.d('WebSocket connected successfully');

      // Listen to incoming messages
      _channel!.stream.listen(
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
      final json = jsonDecode(message as String) as Map<String, dynamic>;
      final subtitleMessage = SubtitleMessage.fromJson(json);

      if (subtitleMessage.type == 'subtitle' && subtitleMessage.subtitle != null) {
        _subtitleController?.add(subtitleMessage.subtitle!);
        AppLogger.v('Received subtitle: ${subtitleMessage.subtitle!.sourceText}');
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

    // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    final delay = Duration(
      seconds: min(
        pow(2, _reconnectAttempts - 1).toInt(),
        AppConfig.wsReconnectMaxDelay.inSeconds,
      ),
    );

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
      _stateController?.add(newState);
      AppLogger.d('WebSocket state changed: $newState');
    }
  }

  /// Send a message to the server
  void send(Map<String, dynamic> message) {
    if (_channel == null || _state != WebSocketState.connected) {
      AppLogger.w('Cannot send message: not connected');
      return;
    }

    try {
      _channel!.sink.add(jsonEncode(message));
      AppLogger.v('Sent message: $message');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to send message', e, stackTrace);
    }
  }

  /// Disconnect from WebSocket
  Future<void> disconnect() async {
    AppLogger.d('Disconnecting WebSocket');
    _manualClose = true;

    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    await _channel?.sink.close();
    _channel = null;

    await _subtitleController?.close();
    await _stateController?.close();

    _subtitleController = null;
    _stateController = null;

    _updateState(WebSocketState.disconnected);
    _lastUrl = null;

    AppLogger.d('WebSocket disconnected');
  }

  /// Check if connected
  bool get isConnected => _state == WebSocketState.connected;

  /// Dispose resources
  void dispose() {
    disconnect();
  }
}

/// WebSocket connection states
enum WebSocketState {
  disconnected,
  connecting,
  connected,
  reconnecting,
  error,
  failed,
}
