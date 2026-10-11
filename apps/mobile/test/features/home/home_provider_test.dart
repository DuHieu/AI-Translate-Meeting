import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/models/meeting.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/home/providers/home_provider.dart';

import '../../helpers/fakes.dart';

void main() {
  late FakeMeetingApi api;
  late SecureStorage storage;
  late ProviderContainer container;

  setUp(() {
    api = FakeMeetingApi();
    storage = SecureStorage.memory();
    container = ProviderContainer(
      overrides: [
        meetingApiProvider.overrideWithValue(api),
        secureStorageProvider.overrideWithValue(storage),
      ],
    );
  });

  tearDown(() => container.dispose());

  test('checkMeetingCode rejects invalid codes', () async {
    final notifier = container.read(homeProvider.notifier);
    final result = await notifier.checkMeetingCode('ab');
    expect(result, isNull);
    expect(container.read(homeProvider).errorMessage, 'invalid_meeting_code');
  });

  test('checkMeetingCode loads active meeting and persists recent', () async {
    api.meeting = const MeetingDetails(
      meetingId: 'm1',
      meetingCode: 'ABC123',
      name: 'Standup',
      isActive: true,
    );

    final meeting =
        await container.read(homeProvider.notifier).checkMeetingCode('abc123');

    expect(meeting?.meetingCode, 'ABC123');
    expect(container.read(homeProvider).resolvedMeeting?.name, 'Standup');
    final recent = await storage.getRecentMeetings();
    expect(recent.first.meetingCode, 'ABC123');
  });

  test('checkMeetingCode maps 404 to meeting_not_found', () async {
    api.getMeetingError = ApiException(
      message: 'missing',
      statusCode: 404,
      type: ApiExceptionType.client,
    );

    final result =
        await container.read(homeProvider.notifier).checkMeetingCode('ZZZZZZ');

    expect(result, isNull);
    expect(container.read(homeProvider).errorMessage, 'meeting_not_found');
    expect(container.read(homeProvider).errorStatusCode, 404);
  });

  test('createQuickMeeting returns meeting details', () async {
    final meeting =
        await container.read(homeProvider.notifier).createQuickMeeting(
              title: 'Quick',
            );

    expect(meeting?.meetingCode, 'ABC123');
    expect(container.read(homeProvider).resolvedMeeting, isNotNull);
  });
}
