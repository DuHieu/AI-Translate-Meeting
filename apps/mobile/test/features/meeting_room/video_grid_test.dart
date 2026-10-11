import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/meeting_room/models/room_participant_view.dart';
import 'package:mobile/features/meeting_room/widgets/participant_tile.dart';
import 'package:mobile/features/meeting_room/widgets/video_grid.dart';
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

RoomParticipantView _p(String name, {bool isLocal = false}) {
  return RoomParticipantView(
    sid: name,
    identity: name,
    displayName: name,
    isLocal: isLocal,
    isMicMuted: false,
    isCameraEnabled: false,
    isSpeaking: false,
  );
}

void main() {
  testWidgets('shows empty waiting state', (tester) async {
    await tester.pumpWidget(_wrap(const VideoGrid(participants: [])));
    await tester.pumpAndSettle();
    expect(find.textContaining('Waiting'), findsOneWidget);
  });

  testWidgets('renders up to four participant tiles', (tester) async {
    await tester.pumpWidget(
      _wrap(
        VideoGrid(
          participants: [
            _p('A', isLocal: true),
            _p('B'),
            _p('C'),
            _p('D'),
            _p('E'),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ParticipantTile), findsNWidgets(4));
  });
}
