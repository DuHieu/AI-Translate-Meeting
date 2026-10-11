import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/meeting.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/prejoin/screens/prejoin_screen.dart';
import 'package:mobile/l10n/app_localizations.dart';

import '../../helpers/fakes.dart';

void main() {
  testWidgets('PrejoinScreen renders form controls without live camera',
      (tester) async {
    final storage = SecureStorage.memory();
    await storage.saveDisplayName('Lan');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(storage),
          permissionServiceProvider.overrideWithValue(FakePermissionService()),
        ],
        child: MaterialApp(
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
          ],
          supportedLocales: AppLocalizations.supportedLocales,
          home: const PrejoinScreen(
            meetingCode: 'ABC123',
            enableLivePreview: false,
            meeting: MeetingDetails(
              meetingId: '1',
              meetingCode: 'ABC123',
              name: 'Demo Room',
              isActive: true,
            ),
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Demo Room'), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);
    expect(find.byType(DropdownButtonFormField<String>), findsNWidgets(2));
    expect(find.textContaining('Join'), findsOneWidget);
  });
}
