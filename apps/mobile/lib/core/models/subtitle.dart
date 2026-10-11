/// Real-time subtitle message with bilingual text
class Subtitle {
  const Subtitle({
    required this.speaker,
    required this.sourceText,
    required this.translatedText,
    required this.timestamp,
    this.tags = const [],
    this.confidence = 0.0,
    this.isPartial = false,
    this.messageId,
  });

  final String speaker;
  final String sourceText;
  final String translatedText;
  final DateTime timestamp;
  final List<String> tags;
  final double confidence;
  final bool isPartial;
  final String? messageId;

  factory Subtitle.fromJson(Map<String, dynamic> json) {
    final isFinal = json['isFinal'] as bool?;
    return Subtitle(
      speaker: (json['speaker'] ?? json['participantName']) as String? ?? '',
      sourceText: (json['sourceText'] ?? json['originalText']) as String? ?? '',
      translatedText: json['translatedText'] as String? ?? '',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ??
          DateTime.now().toUtc(),
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
              const [],
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      isPartial: json['isPartial'] as bool? ?? (isFinal == false),
      messageId: (json['messageId'] ?? json['id'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'speaker': speaker,
        'sourceText': sourceText,
        'translatedText': translatedText,
        'timestamp': timestamp.toIso8601String(),
        'tags': tags,
        'confidence': confidence,
        'isPartial': isPartial,
        'messageId': messageId,
      };

  bool get isDecision => tags.contains('decision');
  bool get isActionItem => tags.contains('action_item');
  bool get hasImportantTag => isDecision || isActionItem;

  Subtitle copyWith({
    String? speaker,
    String? sourceText,
    String? translatedText,
    DateTime? timestamp,
    List<String>? tags,
    double? confidence,
    bool? isPartial,
    String? messageId,
  }) {
    return Subtitle(
      speaker: speaker ?? this.speaker,
      sourceText: sourceText ?? this.sourceText,
      translatedText: translatedText ?? this.translatedText,
      timestamp: timestamp ?? this.timestamp,
      tags: tags ?? this.tags,
      confidence: confidence ?? this.confidence,
      isPartial: isPartial ?? this.isPartial,
      messageId: messageId ?? this.messageId,
    );
  }
}

/// Subtitle WebSocket message wrapper
///
/// Backend contract: `{ "type": "subtitle", "data": { ... } }`
class SubtitleMessage {
  const SubtitleMessage({
    required this.type,
    this.subtitle,
    this.error,
    this.metadata,
  });

  final String type;
  final Subtitle? subtitle;
  final String? error;
  final Map<String, dynamic>? metadata;

  factory SubtitleMessage.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? 'subtitle';
    Subtitle? subtitle;

    if (json['data'] is Map<String, dynamic>) {
      subtitle = Subtitle.fromJson(json['data'] as Map<String, dynamic>);
    } else if (json['subtitle'] is Map<String, dynamic>) {
      subtitle = Subtitle.fromJson(json['subtitle'] as Map<String, dynamic>);
    } else if (type == 'subtitle') {
      subtitle = Subtitle.fromJson(json);
    }

    return SubtitleMessage(
      type: type,
      subtitle: subtitle,
      error: json['error'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}
