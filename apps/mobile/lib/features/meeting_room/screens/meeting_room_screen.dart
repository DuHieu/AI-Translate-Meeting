import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/meeting.dart';
import '../../../core/platform/meeting_platform.dart';
import '../../../features/shared/widgets/error_dialog.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/app_localizations_ext.dart';
import '../providers/livekit_provider.dart';
import '../providers/subtitle_provider.dart';
import '../widgets/meeting_controls.dart';
import '../widgets/network_indicator.dart';
import '../widgets/subtitle_overlay.dart';
import '../widgets/video_grid.dart';

/// Live meeting room with LiveKit video grid, subtitles, and media controls.
class MeetingRoomScreen extends ConsumerStatefulWidget {
  const MeetingRoomScreen({
    required this.meetingCode,
    required this.meetingName,
    required this.joinResponse,
    required this.cameraEnabled,
    required this.micEnabled,
    super.key,
  });

  final String meetingCode;
  final String meetingName;
  final JoinResponse joinResponse;
  final bool cameraEnabled;
  final bool micEnabled;

  @override
  ConsumerState<MeetingRoomScreen> createState() => _MeetingRoomScreenState();
}

class _MeetingRoomScreenState extends ConsumerState<MeetingRoomScreen>
    with WidgetsBindingObserver {
  final _platform = MeetingPlatform();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _platform.configureAudioSession();
      await _platform.startForegroundService(
        meetingCode: widget.meetingCode,
        meetingName: widget.meetingName,
      );
      ref.read(liveKitProvider.notifier).start(
            livekitUrl: widget.joinResponse.livekitUrl,
            livekitToken: widget.joinResponse.livekitToken,
            meetingCode: widget.meetingCode,
            participantId: widget.joinResponse.participantId,
            cameraEnabled: widget.cameraEnabled,
            micEnabled: widget.micEnabled,
          );
      ref.read(subtitleProvider.notifier).start(
            subtitleToken: widget.joinResponse.subtitleToken,
          );
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      // Keep foreground service / background audio alive; degrade handled by provider.
      return;
    }
  }

  Future<void> _confirmAndLeave() async {
    final l10n = AppLocalizations.of(context);
    final shouldLeave = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.leaveMeetingConfirmTitle),
        content: Text(l10n.leaveMeetingConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.leaveMeeting),
          ),
        ],
      ),
    );
    if (shouldLeave == true) {
      await _leave();
    }
  }

  Future<void> _leave() async {
    await _platform.stopForegroundService();
    await Future.wait([
      ref.read(subtitleProvider.notifier).stop(),
      ref.read(liveKitProvider.notifier).leave(),
    ]);
    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: isError ? Theme.of(context).colorScheme.error : null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final liveKit = ref.watch(liveKitProvider);
    final subtitles = ref.watch(subtitleProvider);

    ref.listen<LiveKitState>(liveKitProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        final message = l10n.errorForKey(next.errorMessage);
        if (next.status == LiveKitStatus.failed) {
          ErrorDialog.show(
            context,
            message: message,
            onRetry: () => Navigator.of(context).popUntil((r) => r.isFirst),
          );
        } else {
          _showMessage(message, isError: true);
        }
      }
      if (next.infoMessage != null &&
          next.infoMessage != previous?.infoMessage) {
        _showMessage(l10n.infoForKey(next.infoMessage));
        ref.read(liveKitProvider.notifier).clearInfo();
      }
    });

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _confirmAndLeave();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.meetingName),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: NetworkIndicator(quality: liveKit.networkQuality),
            ),
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Text(
                  '${l10n.meetingCodeLabel}: ${widget.meetingCode}',
                  style: theme.textTheme.labelLarge,
                ),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            if (liveKit.status == LiveKitStatus.connecting ||
                liveKit.isPublishing)
              LinearProgressIndicator(
                minHeight: 2,
                color: theme.colorScheme.primary,
              ),
            if (liveKit.status == LiveKitStatus.reconnecting)
              Container(
                width: double.infinity,
                color: theme.colorScheme.secondaryContainer,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Text(
                  l10n.reconnecting,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSecondaryContainer,
                  ),
                ),
              ),
            Expanded(
              child: liveKit.status == LiveKitStatus.failed
                  ? _FailedState(
                      message: l10n.errorForKey(liveKit.errorMessage),
                      onLeave: _leave,
                    )
                  : Stack(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 250),
                            child: VideoGrid(
                              key: ValueKey(liveKit.participants.length),
                              participants: liveKit.participants,
                            ),
                          ),
                        ),
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: SubtitleOverlay(
                            subtitles: subtitles.visible,
                            isReconnecting: subtitles.isReconnecting,
                            hasFailed: subtitles.hasFailed,
                          ),
                        ),
                      ],
                    ),
            ),
            MeetingControls(
              isMicEnabled: liveKit.isMicEnabled,
              isCameraEnabled: liveKit.isCameraEnabled,
              isSpeakerOn: liveKit.isSpeakerOn,
              isLeaving: liveKit.isLeaving,
              onToggleMic: () {
                ref.read(liveKitProvider.notifier).toggleMic();
              },
              onToggleCamera: () {
                ref.read(liveKitProvider.notifier).toggleCamera();
              },
              onFlipCamera: () {
                ref.read(liveKitProvider.notifier).flipCamera();
              },
              onToggleSpeaker: () {
                ref.read(liveKitProvider.notifier).toggleSpeaker();
              },
              onLeave: _confirmAndLeave,
            ),
          ],
        ),
      ),
    );
  }
}

class _FailedState extends StatelessWidget {
  const _FailedState({
    required this.message,
    required this.onLeave,
  });

  final String message;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onLeave,
              child: Text(l10n.backToHome),
            ),
          ],
        ),
      ),
    );
  }
}
