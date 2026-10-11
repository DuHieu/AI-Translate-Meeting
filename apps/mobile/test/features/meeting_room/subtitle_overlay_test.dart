import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models/subtitle.dart';
import 'package:mobile/features/meeting_room/widgets/subtitle_overlay.dart';
import 'package:mobile/l10n/app_localizations.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
    ],
    supportedLocales: AppLocalizations.supportedLocales,
    home: Scaffold(body: child),
  );
}

void main() {
  testWidgets('renders speaker, original, translation and tags', (tester) async {
    await tester.pumpWidget(
      _wrap(
        SubtitleOverlay(
          subtitles: [
            Subtitle(
              speaker: 'Lan',
              sourceText: 'Xin chào',
              translatedText: 'Hello',
              timestamp: DateTime.utc(2026, 1, 1),
              tags: const ['decision', 'action_item'],
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Lan'), findsOneWidget);
    expect(find.text('Xin chào'), findsOneWidget);
    expect(find.text('Hello'), findsOneWidget);
    expect(find.text('Decision'), findsOneWidget);
    expect(find.text('Action'), findsOneWidget);
  });

  testWidgets('shows reconnecting chip', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const SubtitleOverlay(
          subtitles: [],
          isReconnecting: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Reconnecting captions'), findsOneWidget);
  });
}
