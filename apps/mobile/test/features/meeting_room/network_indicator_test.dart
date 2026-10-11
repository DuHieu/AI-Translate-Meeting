import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/meeting_room/services/livekit_session.dart';
import 'package:mobile/features/meeting_room/widgets/network_indicator.dart';
import 'package:mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('shows poor network label', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        locale: Locale('en'),
        localizationsDelegates: [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        home: Scaffold(
          body: NetworkIndicator(quality: NetworkQualityLevel.poor),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Poor'), findsOneWidget);
  });
}
