import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/app_config.dart';
import '../models/meeting.dart';
import 'logger.dart';

/// Secure storage for sensitive data (tokens, credentials, preferences)
class SecureStorage {
  SecureStorage({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            ),
        _memory = null;

  /// In-memory backend for unit tests (no platform channels).
  SecureStorage.memory()
      : _storage = null,
        _memory = <String, String>{};

  final FlutterSecureStorage? _storage;
  final Map<String, String>? _memory;

  Future<void> _write(String key, String value) async {
    if (_memory != null) {
      _memory[key] = value;
      return;
    }
    await _storage!.write(key: key, value: value);
  }

  Future<String?> _read(String key) async {
    if (_memory != null) {
      return _memory[key];
    }
    return _storage!.read(key: key);
  }

  Future<void> _delete(String key) async {
    if (_memory != null) {
      _memory.remove(key);
      return;
    }
    await _storage!.delete(key: key);
  }

  Future<void> _deleteAll() async {
    if (_memory != null) {
      _memory.clear();
      return;
    }
    await _storage!.deleteAll();
  }

  /// Save all meeting tokens
  Future<void> saveTokens({
    required String livekitToken,
    required String sessionToken,
    required String subtitleToken,
  }) async {
    try {
      await Future.wait([
        _write(AppConfig.keyLivekitToken, livekitToken),
        _write(AppConfig.keySessionToken, sessionToken),
        _write(AppConfig.keySubtitleToken, subtitleToken),
      ]);
      AppLogger.d('Tokens saved successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to save tokens', e, stackTrace);
      rethrow;
    }
  }

  Future<String?> getLivekitToken() async {
    try {
      return await _read(AppConfig.keyLivekitToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read LiveKit token', e, stackTrace);
      return null;
    }
  }

  Future<String?> getSessionToken() async {
    try {
      return await _read(AppConfig.keySessionToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read session token', e, stackTrace);
      return null;
    }
  }

  Future<String?> getSubtitleToken() async {
    try {
      return await _read(AppConfig.keySubtitleToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read subtitle token', e, stackTrace);
      return null;
    }
  }

  Future<void> clearTokens() async {
    try {
      await Future.wait([
        _delete(AppConfig.keyLivekitToken),
        _delete(AppConfig.keySessionToken),
        _delete(AppConfig.keySubtitleToken),
      ]);
      AppLogger.d('Tokens cleared successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to clear tokens', e, stackTrace);
      rethrow;
    }
  }

  Future<void> clearAll() async {
    try {
      await _deleteAll();
      AppLogger.d('All secure storage cleared');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to clear secure storage', e, stackTrace);
      rethrow;
    }
  }

  Future<bool> hasTokens() async {
    try {
      final livekitToken = await getLivekitToken();
      final sessionToken = await getSessionToken();
      return livekitToken != null && sessionToken != null;
    } catch (e) {
      return false;
    }
  }

  Future<void> saveDisplayName(String name) async {
    await _write(AppConfig.keyDisplayName, name.trim());
  }

  Future<String?> getDisplayName() async => _read(AppConfig.keyDisplayName);

  Future<void> saveSpokenLanguage(String code) async {
    await _write(AppConfig.keySpokenLanguage, code);
  }

  Future<String?> getSpokenLanguage() async =>
      _read(AppConfig.keySpokenLanguage);

  Future<void> saveTargetLanguage(String code) async {
    await _write(AppConfig.keyTargetLanguage, code);
  }

  Future<String?> getTargetLanguage() async =>
      _read(AppConfig.keyTargetLanguage);

  Future<void> saveJoinPreferences({
    required String displayName,
    required String spokenLanguage,
    required String targetLanguage,
  }) async {
    await Future.wait([
      saveDisplayName(displayName),
      saveSpokenLanguage(spokenLanguage),
      saveTargetLanguage(targetLanguage),
    ]);
  }

  Future<List<RecentMeeting>> getRecentMeetings() async {
    try {
      final raw = await _read(AppConfig.keyRecentMeetings);
      if (raw == null || raw.isEmpty) return const [];
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .whereType<Map>()
          .map(
              (item) => RecentMeeting.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read recent meetings', e, stackTrace);
      return const [];
    }
  }

  Future<void> addRecentMeeting(RecentMeeting meeting) async {
    try {
      final existing = await getRecentMeetings();
      final filtered = existing
          .where((item) => item.meetingCode != meeting.meetingCode)
          .toList();
      final updated =
          [meeting, ...filtered].take(AppConfig.maxRecentMeetings).toList();
      await _write(
        AppConfig.keyRecentMeetings,
        jsonEncode(updated.map((e) => e.toJson()).toList()),
      );
    } catch (e, stackTrace) {
      AppLogger.e('Failed to save recent meeting', e, stackTrace);
      rethrow;
    }
  }

  Future<void> saveHostToken(String token) async {
    await _write(AppConfig.keyHostToken, token);
  }

  Future<String?> getHostToken() async {
    return _read(AppConfig.keyHostToken);
  }
}
