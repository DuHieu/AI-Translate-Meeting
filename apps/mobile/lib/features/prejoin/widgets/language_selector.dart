import 'package:flutter/material.dart';

import '../../../core/constants/app_config.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/app_localizations_ext.dart';

class LanguageSelector extends StatelessWidget {
  const LanguageSelector({
    required this.label,
    required this.value,
    required this.onChanged,
    this.enabled = true,
    super.key,
  });

  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      items: AppConfig.supportedLanguages
          .map(
            (code) => DropdownMenuItem<String>(
              value: code,
              child: Text(l10n.languageLabel(code)),
            ),
          )
          .toList(),
      onChanged: enabled
          ? (next) {
              if (next != null) onChanged(next);
            }
          : null,
    );
  }
}
