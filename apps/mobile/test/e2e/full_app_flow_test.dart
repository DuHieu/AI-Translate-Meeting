import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/api/websocket_client.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/home/screens/home_screen.dart';
import 'package:mobile/features/meeting_room/providers/livekit_provider.dart';
import 'package:mobile/features/meeting_room/screens/meeting_room_screen.dart';
import 'package:mobile/features/prejoin/screens/prejoin_screen.dart';
import 'package:mobile/l10n/app_localizations_en.dart';

import '../helpers/fake_livekit_session.dart';
import '../helpers/fakes.dart';

const _meetingChannel = MethodChannel('com.layameet.mobile/meeting');

void _mockMeetingPlatformChannel() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(_meetingChannel, (call) async => null);
}

/// pumpAndSettle hangs on indeterminate CircularProgressIndicator animations.
Future<void> pumpUntil(
  WidgetTester tester,
  Finder finder, {
  Duration step = const Duration(milliseconds: 50),
  int maxSteps = 80,
}) async {
  for (var i = 0; i < maxSteps; i++) {
    await tester.pump(step);
    if (finder.evaluate().isNotEmpty) return;
  }
  throw TestFailure('Timed out waiting for $finder');
}

Future<void> pumpUntilGone(
  WidgetTester tester,
  Finder finder, {
  Duration step = const Duration(milliseconds: 50),
  int maxSteps = 80,
}) async {
  for (var i = 0; i < maxSteps; i++) {
    await tester.pump(step);
    await tester.idle();
    if (finder.evaluate().isEmpty) return;
  }
  throw TestFailure('Timed out waiting for $finder to disappear');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final l10n = AppLocalizationsEn();

  setUp(() {
    _mockMeetingPlatformChannel();
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(_meetingChannel, null);
  });

  testWidgets(
    'E2E: Home create → Prejoin → Meeting room → Leave → Home',
    (tester) async {
      tester.platformDispatcher.localeTestValue = const Locale('en');
      addTearDown(tester.platformDispatcher.clearLocaleTestValue);

      final api = FakeMeetingApi();
      final storage = SecureStorage.memory();
      final permissions = FakePermissionService();
      final subtitles = FakeSubtitleSocket();
      final livekit = FakeLiveKitSession();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            meetingApiProvider.overrideWithValue(api),
            secureStorageProvider.overrideWithValue(storage),
            permissionServiceProvider.overrideWithValue(permissions),
            websocketClientProvider.overrideWithValue(subtitles),
            liveKitSessionProvider.overrideWithValue(livekit),
          ],
          child: const LayaMeetApp(),
        ),
      );
      await tester.pump();
      await pumpUntil(tester, find.byType(HomeScreen));

      expect(find.textContaining(l10n.appName), findsWidgets);

      await tester.tap(find.text(l10n.createNewMeeting));
      await tester.pump();
      await tester.idle();
      await tester.pump();
      await pumpUntil(tester, find.byType(PrejoinScreen));

      await tester.idle();
      await tester.pump();
      await pumpUntil(tester, find.byType(TextFormField), maxSteps: 120);
      await tester.ensureVisible(find.byType(TextFormField));
      await tester.pump();
      await tester.enterText(find.byType(TextFormField), 'E2E User');
      await tester.pump();

      final joinButton = find.text(l10n.joinNow);
      await tester.ensureVisible(joinButton);
      await tester.pump();
      await tester.tap(joinButton);
      await tester.pump();
      await tester.idle();
      await tester.pump();
      await pumpUntil(tester, find.byType(MeetingRoomScreen), maxSteps: 160);

      // MeetingRoom starts LiveKit/subtitles in a post-frame callback after
      // native MethodChannel calls — pump until the fake socket connects.
      for (var i = 0; i < 40 && !subtitles.connectCalled; i++) {
        await tester.pump(const Duration(milliseconds: 50));
        await tester.idle();
      }
      expect(subtitles.connectCalled, isTrue);
      expect(api.lastJoinRequest?.displayName, 'E2E User');

      await tester.tap(find.byTooltip(l10n.leaveMeeting));
      await tester.pump();
      await pumpUntil(tester, find.text(l10n.leaveMeetingConfirmTitle));

      await tester.tap(find.text(l10n.leaveMeeting).last);
      await tester.pump();
      // HomeScreen stays under the navigator stack — wait until room is popped.
      await pumpUntilGone(tester, find.byType(MeetingRoomScreen), maxSteps: 160);
      expect(find.byType(HomeScreen), findsOneWidget);
    },
  );

  testWidgets('E2E: invalid meeting code shows error snackbar', (tester) async {
    tester.platformDispatcher.localeTestValue = const Locale('en');
    addTearDown(tester.platformDispatcher.clearLocaleTestValue);

    final api = FakeMeetingApi(getMeetingError: Exception('not found'));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          meetingApiProvider.overrideWithValue(api),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
          permissionServiceProvider.overrideWithValue(FakePermissionService()),
        ],
        child: const LayaMeetApp(),
      ),
    );
    await tester.pump();
    await pumpUntil(tester, find.byType(TextField));

    await tester.enterText(find.byType(TextField), 'ABCDEF');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.login));
    await tester.pump();
    await pumpUntil(tester, find.byType(SnackBar));
  });
}
