import 'package:flutter/services.dart';

import '../utils/logger.dart';

/// Native bridges for Android foreground service + iOS audio session.
class MeetingPlatform {
  MeetingPlatform({MethodChannel? channel})
      : _channel = channel ?? const MethodChannel('com.layameet.mobile/meeting');

  final MethodChannel _channel;

  Future<void> startForegroundService({
    required String meetingCode,
    required String meetingName,
  }) async {
    try {
      await _channel.invokeMethod<void>('startForegroundService', {
        'meetingCode': meetingCode,
        'meetingName': meetingName,
      });
    } on MissingPluginException {
      AppLogger.d('Foreground service plugin unavailable on this platform');
    } catch (error, stackTrace) {
      AppLogger.w('Failed to start foreground service', error);
      AppLogger.d('$stackTrace');
    }
  }

  Future<void> stopForegroundService() async {
    try {
      await _channel.invokeMethod<void>('stopForegroundService');
    } on MissingPluginException {
      // no-op
    } catch (error, stackTrace) {
      AppLogger.w('Failed to stop foreground service', error);
      AppLogger.d('$stackTrace');
    }
  }

  Future<void> configureAudioSession() async {
    try {
      await _channel.invokeMethod<void>('configureAudioSession');
    } on MissingPluginException {
      // no-op on unsupported platforms
    } catch (error, stackTrace) {
      AppLogger.w('Failed to configure audio session', error);
      AppLogger.d('$stackTrace');
    }
  }
}

final meetingPlatform = MeetingPlatform();
