import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';
import '../services/livekit_session.dart';

/// Green / yellow / red connection quality indicator.
class NetworkIndicator extends StatelessWidget {
  const NetworkIndicator({
    required this.quality,
    super.key,
  });

  final NetworkQualityLevel quality;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final (color, label, icon) = switch (quality) {
      NetworkQualityLevel.excellent => (
          Colors.green,
          l10n.networkExcellent,
          Icons.signal_cellular_alt,
        ),
      NetworkQualityLevel.good => (
          Colors.amber.shade700,
          l10n.networkGood,
          Icons.signal_cellular_alt_2_bar,
        ),
      NetworkQualityLevel.poor => (
          theme.colorScheme.error,
          l10n.networkPoor,
          Icons.signal_cellular_alt_1_bar,
        ),
      NetworkQualityLevel.unknown => (
          theme.colorScheme.outline,
          l10n.networkUnknown,
          Icons.signal_cellular_null,
        ),
    };

    return Semantics(
      label: label,
      child: Tooltip(
        message: label,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(color: color),
            ),
          ],
        ),
      ),
    );
  }
}
