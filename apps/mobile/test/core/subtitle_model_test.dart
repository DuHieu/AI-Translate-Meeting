import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/subtitle.dart';

void main() {
  test('parses backend broadcast envelope with data payload', () {
    final message = SubtitleMessage.fromJson({
      'type': 'subtitle',
      'data': {
        'id': 'abc',
        'participantName': 'Lan',
        'originalText': 'Xin chào',
        'translatedText': 'Hello',
        'isFinal': false,
        'tags': ['decision'],
        'confidence': 0.91,
        'timestamp': '2026-01-01T00:00:00Z',
      },
    });

    expect(message.type, 'subtitle');
    expect(message.subtitle?.speaker, 'Lan');
    expect(message.subtitle?.sourceText, 'Xin chào');
    expect(message.subtitle?.translatedText, 'Hello');
    expect(message.subtitle?.isPartial, isTrue);
    expect(message.subtitle?.messageId, 'abc');
    expect(message.subtitle?.isDecision, isTrue);
  });
}
