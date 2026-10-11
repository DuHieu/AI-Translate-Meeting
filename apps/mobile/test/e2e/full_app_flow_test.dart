import 'package:flutter/material.dart';
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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final l10n = AppLocalizationsEn();

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
      await tester.pumpAndSettle();

      expect(find.byType(HomeScreen), findsOneWidget);
      expect(find.textContaining(l10n.appName), findsWidgets);

      await tester.tap(find.text(l10n.createNewMeeting));
      await tester.pumpAndSettle();

      expect(find.byType(PrejoinScreen), findsOneWidget);

      final nameField = find.byType(TextFormField);
      expect(nameField, findsOneWidget);
      await tester.enterText(nameField, 'E2E User');
      await tester.pumpAndSettle();

      await tester.tap(find.text(l10n.joinNow));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      expect(find.byType(MeetingRoomScreen), findsOneWidget);
      expect(subtitles.connectCalled, isTrue);
      expect(api.lastJoinRequest?.displayName, 'E2E User');

      await tester.tap(find.byTooltip(l10n.leaveMeeting));
      await tester.pumpAndSettle();

      expect(find.text(l10n.leaveMeetingConfirmTitle), findsOneWidget);
      await tester.tap(find.text(l10n.leaveMeeting).last);
      await tester.pumpAndSettle();

      expect(find.byType(HomeScreen), findsOneWidget);
      expect(find.byType(MeetingRoomScreen), findsNothing);
    },
  );

  testWidgets('E2E: invalid meeting code shows error snackbar', (tester) async {
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
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'ABCDEF');
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.login));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
  });
}
