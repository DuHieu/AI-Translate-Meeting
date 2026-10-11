import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/home/screens/home_screen.dart';
import 'package:mobile/l10n/app_localizations.dart';

import '../../helpers/fakes.dart';

Widget _wrap(Widget child, {List<Override> overrides = const []}) {
  return ProviderScope(
    overrides: overrides,
    child: MaterialApp(
      locale: const Locale('en'),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: child,
    ),
  );
}

void main() {
  testWidgets('HomeScreen shows create and join actions', (tester) async {
    tester.platformDispatcher.localeTestValue = const Locale('en');
    addTearDown(tester.platformDispatcher.clearLocaleTestValue);

    await tester.pumpWidget(
      _wrap(
        const HomeScreen(),
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
        ],
      ),
    );
    // Avoid pumpAndSettle — progress indicators elsewhere can hang settle.
    await tester.pump();
    await tester.idle();
    await tester.pump();

    // FilledButton.icon builds _FilledButtonWithIcon; byType(FilledButton) is exact-type only.
    expect(
      find.byWidgetPredicate((w) => w is FilledButton),
      findsWidgets,
    );
    expect(find.byType(TextField), findsOneWidget);
    expect(find.byIcon(Icons.login), findsOneWidget);
  });

  testWidgets('Meeting code field uppercases input', (tester) async {
    tester.platformDispatcher.localeTestValue = const Locale('en');
    addTearDown(tester.platformDispatcher.clearLocaleTestValue);

    await tester.pumpWidget(
      _wrap(
        const HomeScreen(),
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
        ],
      ),
    );
    await tester.pump();
    await tester.idle();
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'abc123');
    await tester.pump();

    expect(find.text('ABC123'), findsOneWidget);
  });
}
