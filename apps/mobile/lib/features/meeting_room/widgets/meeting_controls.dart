import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';

/// Bottom control bar: mic, camera, flip, speaker, leave.
class MeetingControls extends StatelessWidget {
  const MeetingControls({
    required this.isMicEnabled,
    required this.isCameraEnabled,
    required this.isSpeakerOn,
    required this.isLeaving,
    required this.onToggleMic,
    required this.onToggleCamera,
    required this.onFlipCamera,
    required this.onToggleSpeaker,
    required this.onLeave,
    super.key,
  });

  final bool isMicEnabled;
  final bool isCameraEnabled;
  final bool isSpeakerOn;
  final bool isLeaving;
  final VoidCallback onToggleMic;
  final VoidCallback onToggleCamera;
  final VoidCallback onFlipCamera;
  final VoidCallback onToggleSpeaker;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surface.withOpacity(0.92),
      elevation: 2,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _ControlButton(
                tooltip: isMicEnabled ? l10n.micOn : l10n.micOff,
                icon: isMicEnabled ? Icons.mic : Icons.mic_off,
                active: isMicEnabled,
                onPressed: isLeaving ? null : onToggleMic,
              ),
              _ControlButton(
                tooltip: isCameraEnabled ? l10n.cameraOn : l10n.cameraOff,
                icon: isCameraEnabled ? Icons.videocam : Icons.videocam_off,
                active: isCameraEnabled,
                onPressed: isLeaving ? null : onToggleCamera,
              ),
              _ControlButton(
                tooltip: l10n.flipCamera,
                icon: Icons.cameraswitch,
                active: true,
                onPressed: isLeaving || !isCameraEnabled ? null : onFlipCamera,
              ),
              _ControlButton(
                tooltip: isSpeakerOn ? l10n.speakerOn : l10n.speakerOff,
                icon: isSpeakerOn ? Icons.volume_up : Icons.volume_off,
                active: isSpeakerOn,
                onPressed: isLeaving ? null : onToggleSpeaker,
              ),
              _ControlButton(
                tooltip: l10n.leaveMeeting,
                icon: isLeaving ? Icons.hourglass_top : Icons.call_end,
                active: false,
                danger: true,
                onPressed: isLeaving ? null : onLeave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Alias matching the mobile plan deliverable name.
typedef ControlButtons = MeetingControls;

class _ControlButton extends StatelessWidget {
  const _ControlButton({
    required this.tooltip,
    required this.icon,
    required this.active,
    required this.onPressed,
    this.danger = false,
  });

  final String tooltip;
  final IconData icon;
  final bool active;
  final bool danger;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final Color background;
    final Color foreground;

    if (danger) {
      background = theme.colorScheme.error;
      foreground = theme.colorScheme.onError;
    } else if (active) {
      background = theme.colorScheme.primaryContainer;
      foreground = theme.colorScheme.onPrimaryContainer;
    } else {
      background = theme.colorScheme.surfaceContainerHighest;
      foreground = theme.colorScheme.onSurfaceVariant;
    }

    return Semantics(
      button: true,
      label: tooltip,
      enabled: onPressed != null,
      child: Tooltip(
        message: tooltip,
        child: Material(
          color: background,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onPressed,
            child: SizedBox(
              width: 52,
              height: 52,
              child: Icon(icon, color: foreground),
            ),
          ),
        ),
      ),
    );
  }
}
