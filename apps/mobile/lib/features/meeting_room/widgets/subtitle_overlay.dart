import 'package:flutter/material.dart';

import '../../../core/models/subtitle.dart';
import '../../../l10n/app_localizations.dart';

/// Bottom overlay showing the latest bilingual subtitles.
class SubtitleOverlay extends StatelessWidget {
  const SubtitleOverlay({
    required this.subtitles,
    this.isReconnecting = false,
    this.hasFailed = false,
    super.key,
  });

  final List<Subtitle> subtitles;
  final bool isReconnecting;
  final bool hasFailed;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    if (subtitles.isEmpty && !isReconnecting && !hasFailed) {
      return const SizedBox.shrink();
    }

    return IgnorePointer(
      child: Align(
        alignment: Alignment.bottomCenter,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isReconnecting)
                _StatusChip(
                  icon: Icons.sync,
                  label: l10n.subtitleReconnecting,
                  color: theme.colorScheme.secondaryContainer,
                  foreground: theme.colorScheme.onSecondaryContainer,
                ),
              if (hasFailed)
                _StatusChip(
                  icon: Icons.subtitles_off,
                  label: l10n.subtitleUnavailable,
                  color: theme.colorScheme.errorContainer,
                  foreground: theme.colorScheme.onErrorContainer,
                ),
              if (subtitles.isNotEmpty) ...[
                if (isReconnecting || hasFailed) const SizedBox(height: 8),
                ...subtitles.asMap().entries.map((entry) {
                  final index = entry.key;
                  final subtitle = entry.value;
                  final isLatest = index == subtitles.length - 1;
                  return Padding(
                    padding: EdgeInsets.only(top: index == 0 ? 0 : 8),
                    child: _SubtitleCard(
                      subtitle: subtitle,
                      emphasized: isLatest,
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.foreground,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: foreground),
            const SizedBox(width: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: foreground,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubtitleCard extends StatelessWidget {
  const _SubtitleCard({
    required this.subtitle,
    required this.emphasized,
  });

  final Subtitle subtitle;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context);
    final opacity = emphasized ? 1.0 : 0.72;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 200),
      opacity: opacity,
      child: Material(
        color: Colors.black.withOpacity(emphasized ? 0.72 : 0.55),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (subtitle.speaker.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.85),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        subtitle.speaker,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onPrimary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (subtitle.isPartial) ...[
                    const SizedBox(width: 8),
                    Text(
                      l10n.subtitlePartial,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white70,
                      ),
                    ),
                  ],
                  const Spacer(),
                  if (subtitle.isDecision)
                    _TagBadge(
                        label: l10n.tagDecision,
                        color: const Color(0xFFFF6B6B)),
                  if (subtitle.isActionItem) ...[
                    if (subtitle.isDecision) const SizedBox(width: 4),
                    _TagBadge(
                      label: l10n.tagActionItem,
                      color: const Color(0xFF4ECDC4),
                    ),
                  ],
                ],
              ),
              if (subtitle.sourceText.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  subtitle.sourceText,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.white70,
                    height: 1.3,
                  ),
                ),
              ],
              if (subtitle.translatedText.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle.translatedText,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    height: 1.25,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _TagBadge extends StatelessWidget {
  const _TagBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
