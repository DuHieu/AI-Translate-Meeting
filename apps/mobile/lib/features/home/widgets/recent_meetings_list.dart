import 'package:flutter/material.dart';

import '../../../core/models/meeting.dart';
import '../../../l10n/app_localizations.dart';

/// Horizontal chips for quick re-join of recent meeting codes.
class RecentMeetingsList extends StatelessWidget {
  const RecentMeetingsList({
    required this.meetings,
    required this.onRejoin,
    this.enabled = true,
    super.key,
  });

  final List<RecentMeeting> meetings;
  final ValueChanged<RecentMeeting> onRejoin;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.recentMeetings,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        if (meetings.isEmpty)
          Text(
            l10n.noRecentMeetings,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: meetings.map((meeting) {
              return ActionChip(
                avatar: Icon(
                  Icons.history,
                  size: 18,
                  color: theme.colorScheme.primary,
                ),
                label: Text('${meeting.meetingCode} · ${meeting.name}'),
                onPressed: enabled ? () => onRejoin(meeting) : null,
                tooltip: l10n.rejoin,
              );
            }).toList(),
          ),
      ],
    );
  }
}
