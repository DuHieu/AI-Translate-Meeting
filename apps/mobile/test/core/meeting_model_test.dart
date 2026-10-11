import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/meeting.dart';

void main() {
  test('JoinResponse maps backend token aliases', () {
    final response = JoinResponse.fromJson({
      'liveKitUrl': 'wss://example',
      'token': 'abc',
      'sessionToken': 'sess',
      'subtitleToken': 'sub',
      'participantId': 'p1',
      'meetingCode': 'abc123',
    });

    expect(response.livekitUrl, 'wss://example');
    expect(response.livekitToken, 'abc');
    expect(response.meetingCode, 'ABC123');
  });

  test('MeetingDetails treats endedAt as inactive', () {
    final details = MeetingDetails.fromJson({
      'meetingId': '1',
      'meetingCode': 'XYZ789',
      'name': 'Done',
      'createdAt': '2026-01-01T00:00:00Z',
      'endedAt': '2026-01-01T01:00:00Z',
    });

    expect(details.isActive, isFalse);
  });
}
