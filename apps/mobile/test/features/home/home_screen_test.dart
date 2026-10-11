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
    await tester.pumpWidget(
      _wrap(
        const HomeScreen(),
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
        ],
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(FilledButton), findsWidgets);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.byIcon(Icons.login), findsOneWidget);
  });

  testWidgets('Meeting code field uppercases input', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const HomeScreen(),
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
        ],
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'abc123');
    await tester.pump();

    expect(find.text('ABC123'), findsOneWidget);
  });
}
