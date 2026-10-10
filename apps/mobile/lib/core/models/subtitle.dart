import 'package:freezed_annotation/freezed_annotation.dart';

part 'subtitle.freezed.dart';
part 'subtitle.g.dart';

/// Real-time subtitle message with bilingual text
@freezed
class Subtitle with _$Subtitle {
  const factory Subtitle({
    required String speaker,
    required String sourceText,
    required String translatedText,
    required DateTime timestamp,
    @Default([]) List<String> tags,
    @Default(0.0) double confidence,
    @Default(false) bool isPartial,
    String? messageId,
  }) = _Subtitle;

  factory Subtitle.fromJson(Map<String, dynamic> json) =>
      _$SubtitleFromJson(json);

  const Subtitle._();

  /// Check if subtitle has decision tag
  bool get isDecision => tags.contains('decision');

  /// Check if subtitle has action item tag
  bool get isActionItem => tags.contains('action_item');

  /// Check if subtitle has any important tag
  bool get hasImportantTag => isDecision || isActionItem;

  /// Get display color based on tags
  String get tagColor {
    if (isDecision) return '#FF6B6B'; // Red for decisions
    if (isActionItem) return '#4ECDC4'; // Teal for action items
    return '#95A5A6'; // Gray for normal
  }
}

/// Subtitle WebSocket message wrapper
@freezed
class SubtitleMessage with _$SubtitleMessage {
  const factory SubtitleMessage({
    required String type,
    Subtitle? subtitle,
    String? error,
    Map<String, dynamic>? metadata,
  }) = _SubtitleMessage;

  factory SubtitleMessage.fromJson(Map<String, dynamic> json) =>
      _$SubtitleMessageFromJson(json);
}
