import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_config.dart';
import 'logger.dart';

/// Secure storage for sensitive data (tokens, credentials)
class SecureStorage {
  final FlutterSecureStorage _storage;

  SecureStorage()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(
            encryptedSharedPreferences: true,
          ),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock,
          ),
        );

  /// Save all meeting tokens
  Future<void> saveTokens({
    required String livekitToken,
    required String sessionToken,
    required String subtitleToken,
  }) async {
    try {
      await Future.wait([
        _storage.write(key: AppConfig.keyLivekitToken, value: livekitToken),
        _storage.write(key: AppConfig.keySessionToken, value: sessionToken),
        _storage.write(key: AppConfig.keySubtitleToken, value: subtitleToken),
      ]);
      AppLogger.d('Tokens saved successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to save tokens', e, stackTrace);
      rethrow;
    }
  }

  /// Get LiveKit token
  Future<String?> getLivekitToken() async {
    try {
      return await _storage.read(key: AppConfig.keyLivekitToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read LiveKit token', e, stackTrace);
      return null;
    }
  }

  /// Get session token
  Future<String?> getSessionToken() async {
    try {
      return await _storage.read(key: AppConfig.keySessionToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read session token', e, stackTrace);
      return null;
    }
  }

  /// Get subtitle token
  Future<String?> getSubtitleToken() async {
    try {
      return await _storage.read(key: AppConfig.keySubtitleToken);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to read subtitle token', e, stackTrace);
      return null;
    }
  }

  /// Clear all tokens
  Future<void> clearTokens() async {
    try {
      await Future.wait([
        _storage.delete(key: AppConfig.keyLivekitToken),
        _storage.delete(key: AppConfig.keySessionToken),
        _storage.delete(key: AppConfig.keySubtitleToken),
      ]);
      AppLogger.d('Tokens cleared successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to clear tokens', e, stackTrace);
      rethrow;
    }
  }

  /// Clear all stored data
  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
      AppLogger.d('All secure storage cleared');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to clear secure storage', e, stackTrace);
      rethrow;
    }
  }

  /// Check if tokens exist
  Future<bool> hasTokens() async {
    try {
      final livekitToken = await getLivekitToken();
      final sessionToken = await getSessionToken();
      return livekitToken != null && sessionToken != null;
    } catch (e) {
      return false;
    }
  }
}
