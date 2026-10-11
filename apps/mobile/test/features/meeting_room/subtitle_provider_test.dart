import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/websocket_client.dart';
import 'package:mobile/core/constants/app_config.dart';
import 'package:mobile/core/models/subtitle.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/features/meeting_room/providers/subtitle_provider.dart';

void main() {
  late FakeSubtitleSocket socket;
  late ProviderContainer container;

  setUp(() {
    socket = FakeSubtitleSocket();
    container = ProviderContainer(
      overrides: [
        websocketClientProvider.overrideWithValue(socket),
      ],
    );
  });

  tearDown(() {
    socket.dispose();
    container.dispose();
  });

  test('start connects with subtitle token', () async {
    await container.read(subtitleProvider.notifier).start(
          subtitleToken: 'sub-token',
          wsUrl: 'ws://example/ws/transcribe',
        );

    expect(socket.connectCalled, isTrue);
    expect(socket.lastToken, 'sub-token');
    expect(socket.lastUrl, 'ws://example/ws/transcribe');
    expect(
      container.read(subtitleProvider).connectionState,
      WebSocketState.connected,
    );
  });

  test('buffers subtitles and exposes latest three', () async {
    await container.read(subtitleProvider.notifier).start(
          subtitleToken: 't',
        );

    for (var i = 1; i <= 5; i++) {
      socket.emit(
        Subtitle(
          speaker: 'A',
          sourceText: 's$i',
          translatedText: 't$i',
          timestamp: DateTime.utc(2026, 1, 1, 0, 0, i),
          messageId: 'm$i',
        ),
      );
    }
    await Future<void>.delayed(Duration.zero);

    final state = container.read(subtitleProvider);
    expect(state.buffer.length, 5);
    expect(state.visible.map((e) => e.messageId), ['m3', 'm4', 'm5']);
  });

  test('replaces partial updates with same message id', () async {
    await container.read(subtitleProvider.notifier).start(
          subtitleToken: 't',
        );

    socket.emit(
      Subtitle(
        speaker: 'Ada',
        sourceText: 'Hel',
        translatedText: 'Xin',
        timestamp: DateTime.utc(2026, 1, 1),
        isPartial: true,
        messageId: 'u1',
      ),
    );
    socket.emit(
      Subtitle(
        speaker: 'Ada',
        sourceText: 'Hello',
        translatedText: 'Xin chào',
        timestamp: DateTime.utc(2026, 1, 1),
        isPartial: false,
        messageId: 'u1',
      ),
    );
    await Future<void>.delayed(Duration.zero);

    final state = container.read(subtitleProvider);
    expect(state.buffer.length, 1);
    expect(state.buffer.first.sourceText, 'Hello');
    expect(state.buffer.first.isPartial, isFalse);
  });

  test('trims buffer to max size', () async {
    await container.read(subtitleProvider.notifier).start(
          subtitleToken: 't',
        );

    for (var i = 0; i < AppConfig.maxSubtitleBuffer + 5; i++) {
      socket.emit(
        Subtitle(
          speaker: 'A',
          sourceText: 's$i',
          translatedText: 't$i',
          timestamp: DateTime.utc(2026, 1, 1),
          messageId: 'id-$i',
        ),
      );
    }
    await Future<void>.delayed(Duration.zero);

    expect(
      container.read(subtitleProvider).buffer.length,
      AppConfig.maxSubtitleBuffer,
    );
  });

  test('stop disconnects socket and clears buffer', () async {
    await container.read(subtitleProvider.notifier).start(
          subtitleToken: 't',
        );
    socket.emit(
      Subtitle(
        speaker: 'A',
        sourceText: 'hi',
        translatedText: 'chao',
        timestamp: DateTime.utc(2026, 1, 1),
      ),
    );
    await Future<void>.delayed(Duration.zero);

    await container.read(subtitleProvider.notifier).stop();

    expect(socket.disconnectCalled, isTrue);
    expect(container.read(subtitleProvider).buffer, isEmpty);
    expect(
      container.read(subtitleProvider).connectionState,
      WebSocketState.disconnected,
    );
  });
}
