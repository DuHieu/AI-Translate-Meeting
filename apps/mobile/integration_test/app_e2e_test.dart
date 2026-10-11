import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/api/meeting_api.dart';
import 'package:mobile/core/api/websocket_client.dart';
import 'package:mobile/core/constants/app_config.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/home/screens/home_screen.dart';
import 'package:mobile/features/meeting_room/providers/livekit_provider.dart';
import 'package:mobile/features/meeting_room/screens/meeting_room_screen.dart';
import 'package:mobile/features/prejoin/screens/prejoin_screen.dart';
import 'package:mobile/l10n/app_localizations_en.dart';

import '../test/helpers/fake_livekit_session.dart';
import '../test/helpers/fakes.dart';

/// Device/emulator E2E.
///
/// Set `E2E_LIVE=1` (+ API_BASE_URL dart-define) to hit a live API stack.
/// LiveKit media + subtitle socket stay faked so CI/emulator stays deterministic.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final l10n = AppLocalizationsEn();
  const live = bool.fromEnvironment('E2E_LIVE', defaultValue: false);

  testWidgets('device E2E happy path', (tester) async {
    final storage = SecureStorage.memory();
    final MeetingApi api;
    if (live) {
      api = MeetingApi(
        ApiClient(
          baseUrl: AppConfig.apiBaseUrl,
          secureStorage: storage,
        ),
      );
    } else {
      api = FakeMeetingApi();
    }

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          meetingApiProvider.overrideWithValue(api),
          secureStorageProvider.overrideWithValue(storage),
          permissionServiceProvider.overrideWithValue(FakePermissionService()),
          websocketClientProvider.overrideWithValue(FakeSubtitleSocket()),
          liveKitSessionProvider.overrideWithValue(FakeLiveKitSession()),
        ],
        child: const LayaMeetApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 3));

    expect(find.byType(HomeScreen), findsOneWidget);

    await tester.tap(find.text(l10n.createNewMeeting));
    await tester.pumpAndSettle(const Duration(seconds: 5));

    expect(find.byType(PrejoinScreen), findsOneWidget);
    await tester.enterText(find.byType(TextFormField), 'Device E2E');
    await tester.pumpAndSettle();

    await tester.tap(find.text(l10n.joinNow));
    await tester.pumpAndSettle(const Duration(seconds: 8));

    expect(find.byType(MeetingRoomScreen), findsOneWidget);

    await tester.tap(find.byTooltip(l10n.leaveMeeting));
    await tester.pumpAndSettle();
    await tester.tap(find.text(l10n.leaveMeeting).last);
    await tester.pumpAndSettle(const Duration(seconds: 3));

    expect(find.byType(HomeScreen), findsOneWidget);
  });
}
