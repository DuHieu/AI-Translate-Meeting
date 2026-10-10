import '../constants/app_config.dart';

/// Input validation utilities
class Validators {
  /// Validate meeting code format (6 alphanumeric characters)
  static bool isValidMeetingCode(String code) {
    if (code.length != AppConfig.meetingCodeLength) {
      return false;
    }
    return RegExp(r'^[A-Z0-9]{6}$').hasMatch(code.toUpperCase());
  }

  /// Validate display name (1-50 characters)
  static bool isValidDisplayName(String name) {
    final trimmed = name.trim();
    return trimmed.isNotEmpty && trimmed.length <= 50;
  }

  /// Validate language code (must be in supported list)
  static bool isValidLanguageCode(String code) {
    return AppConfig.supportedLanguages.contains(code);
  }

  /// Validate email format
  static bool isValidEmail(String email) {
    return RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    ).hasMatch(email);
  }

  /// Normalize meeting code to uppercase
  static String normalizeMeetingCode(String code) {
    return code.trim().toUpperCase();
  }

  /// Get validation error message for meeting code
  static String? getMeetingCodeError(String code) {
    if (code.isEmpty) {
      return 'Meeting code is required';
    }
    if (code.length != AppConfig.meetingCodeLength) {
      return 'Meeting code must be ${AppConfig.meetingCodeLength} characters';
    }
    if (!isValidMeetingCode(code)) {
      return 'Meeting code must contain only letters and numbers';
    }
    return null;
  }

  /// Get validation error message for display name
  static String? getDisplayNameError(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) {
      return 'Display name is required';
    }
    if (trimmed.length > 50) {
      return 'Display name must be 50 characters or less';
    }
    return null;
  }

  // Prevent instantiation
  Validators._();
}
