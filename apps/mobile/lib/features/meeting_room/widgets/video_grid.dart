import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import '../models/room_participant_view.dart';
import 'participant_tile.dart';

/// Responsive video grid for 1–4 visible participants (MVP).
class VideoGrid extends StatelessWidget {
  const VideoGrid({
    required this.participants,
    super.key,
  });

  final List<RoomParticipantView> participants;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final visible = participants.take(4).toList();

    if (visible.isEmpty) {
      return Center(
        child: Text(
          l10n.waitingForParticipants,
          style: Theme.of(context).textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
      );
    }

    if (visible.length == 1) {
      return ParticipantTile(participant: visible.first);
    }

    if (visible.length == 2) {
      return Column(
        children: [
          Expanded(child: ParticipantTile(participant: visible[0])),
          const SizedBox(height: 8),
          Expanded(child: ParticipantTile(participant: visible[1])),
        ],
      );
    }

    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: visible.length,
      itemBuilder: (context, index) {
        return ParticipantTile(participant: visible[index]);
      },
    );
  }
}
