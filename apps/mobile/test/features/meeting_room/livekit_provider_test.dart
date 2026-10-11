import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/meeting_room/models/room_participant_view.dart';
import 'package:mobile/features/meeting_room/providers/livekit_provider.dart';
import 'package:mobile/features/meeting_room/services/livekit_session.dart';

import '../../helpers/fakes.dart';

void main() {
  late FakeLiveKitSession session;
  late FakeMeetingApi api;
  late ProviderContainer container;

  setUp(() {
    session = FakeLiveKitSession(
      participants: const [
        RoomParticipantView(
          sid: 'local',
          identity: 'local',
          displayName: 'Ada',
          isLocal: true,
          isMicMuted: true,
          isCameraEnabled: false,
          isSpeaking: false,
        ),
      ],
    );
    api = FakeMeetingApi();
    container = ProviderContainer(
      overrides: [
        liveKitSessionProvider.overrideWith((ref) => session),
        meetingApiProvider.overrideWithValue(api),
        secureStorageProvider.overrideWithValue(SecureStorage.memory()),
      ],
    );
  });

  tearDown(() => container.dispose());

  test('start connects then publishes camera before microphone', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: true,
          micEnabled: true,
        );

    expect(session.connectCalled, isTrue);
    // start() publishes media then enables speaker by default.
    expect(session.publishOrder, ['camera', 'microphone', 'speaker_on']);
    expect(container.read(liveKitProvider).status, LiveKitStatus.connected);
    expect(container.read(liveKitProvider).isPublishing, isFalse);
  });

  test('start can enable camera only', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: true,
          micEnabled: false,
        );

    expect(session.publishOrder, ['camera', 'speaker_on']);
  });

  test('start maps connect failure', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);
    session.connectError = Exception('boom');

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: true,
          micEnabled: true,
        );

    expect(container.read(liveKitProvider).status, LiveKitStatus.failed);
    expect(
      container.read(liveKitProvider).errorMessage,
      'livekit_connect_failed',
    );
  });

  test('leave disconnects session and clears tokens', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);
    final storage = container.read(secureStorageProvider);
    await storage.saveTokens(
      livekitToken: 'lk',
      sessionToken: 's',
      subtitleToken: 'sub',
    );

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: false,
          micEnabled: false,
        );

    await container.read(liveKitProvider.notifier).leave();

    expect(session.disconnectCalled, isTrue);
    expect(
      container.read(liveKitProvider).status,
      LiveKitStatus.disconnected,
    );
    expect(await storage.getLivekitToken(), isNull);
  });

  test('flip and speaker update publish order', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: true,
          micEnabled: true,
        );

    await container.read(liveKitProvider.notifier).flipCamera();
    await container.read(liveKitProvider.notifier).toggleSpeaker();

    expect(session.publishOrder, contains('flip'));
    expect(session.publishOrder, contains('speaker_off'));
  });

  test('poor network degrades video', () async {
    final sub = container.listen(liveKitProvider, (_, __) {});
    addTearDown(sub.close);

    await container.read(liveKitProvider.notifier).start(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'token',
          meetingCode: 'ABC123',
          participantId: 'p1',
          cameraEnabled: true,
          micEnabled: true,
        );

    session.emitQuality(NetworkQualityLevel.poor);
    await Future<void>.delayed(Duration.zero);

    expect(container.read(liveKitProvider).isVideoDegraded, isTrue);
    expect(container.read(liveKitProvider).isCameraEnabled, isFalse);
    expect(container.read(liveKitProvider).infoMessage, 'video_degraded');
  });
}
