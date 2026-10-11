import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/meeting_room/widgets/meeting_controls.dart';
import 'package:mobile/l10n/app_localizations.dart';

void main() {
  testWidgets('invokes control callbacks', (tester) async {
    var mic = 0;
    var cam = 0;
    var flip = 0;
    var speaker = 0;
    var leave = 0;

    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
        ],
        home: Scaffold(
          body: MeetingControls(
            isMicEnabled: true,
            isCameraEnabled: true,
            isSpeakerOn: true,
            isLeaving: false,
            onToggleMic: () => mic++,
            onToggleCamera: () => cam++,
            onFlipCamera: () => flip++,
            onToggleSpeaker: () => speaker++,
            onLeave: () => leave++,
          ),
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.mic));
    await tester.tap(find.byIcon(Icons.videocam));
    await tester.tap(find.byIcon(Icons.cameraswitch));
    await tester.tap(find.byIcon(Icons.volume_up));
    await tester.tap(find.byIcon(Icons.call_end));
    await tester.pump();

    expect(mic, 1);
    expect(cam, 1);
    expect(flip, 1);
    expect(speaker, 1);
    expect(leave, 1);
  });
}
