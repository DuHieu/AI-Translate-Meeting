import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../l10n/app_localizations.dart';
import '../models/room_participant_view.dart';

/// Single participant video tile with name + mute/camera badges.
class ParticipantTile extends StatelessWidget {
  const ParticipantTile({
    required this.participant,
    super.key,
  });

  final RoomParticipantView participant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final initials = _initials(participant.displayName);
    final nameLabel = participant.isLocal
        ? '${participant.displayName} (${l10n.youLabel})'
        : participant.displayName;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          border: participant.isSpeaking
              ? Border.all(color: theme.colorScheme.primary, width: 2)
              : null,
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (participant.videoTrack != null && participant.isCameraEnabled)
              lk.VideoTrackRenderer(
                participant.videoTrack!,
                fit: lk.VideoViewFit.cover,
              )
            else
              Center(
                child: CircleAvatar(
                  radius: 36,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Text(
                    initials,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            Positioned(
              left: 8,
              right: 8,
              bottom: 8,
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.55),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        nameLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  _BadgeIcon(
                    icon: participant.isMicMuted ? Icons.mic_off : Icons.mic,
                    emphasized: participant.isMicMuted,
                  ),
                  const SizedBox(width: 4),
                  _BadgeIcon(
                    icon: participant.isCameraEnabled
                        ? Icons.videocam
                        : Icons.videocam_off,
                    emphasized: !participant.isCameraEnabled,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts.first.substring(0, 1).toUpperCase();
    }
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1))
        .toUpperCase();
  }
}

class _BadgeIcon extends StatelessWidget {
  const _BadgeIcon({
    required this.icon,
    required this.emphasized,
  });

  final IconData icon;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: emphasized
            ? theme.colorScheme.error.withOpacity(0.9)
            : Colors.black.withOpacity(0.55),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 16, color: Colors.white),
    );
  }
}
