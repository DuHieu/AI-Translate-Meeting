import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/constants/app_config.dart';
import '../../../core/utils/validators.dart';
import '../../../l10n/app_localizations.dart';

/// Uppercase auto-formatting meeting code field with clear + live validation.
class MeetingCodeField extends StatelessWidget {
  const MeetingCodeField({
    required this.controller,
    required this.onChanged,
    this.onSubmitted,
    this.enabled = true,
    super.key,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final code = controller.text;
    final isComplete = code.length == AppConfig.meetingCodeLength;
    final isValid = Validators.isValidMeetingCode(code);
    final showError = code.isNotEmpty && isComplete && !isValid;

    return TextField(
      controller: controller,
      enabled: enabled,
      textCapitalization: TextCapitalization.characters,
      autocorrect: false,
      enableSuggestions: false,
      maxLength: AppConfig.meetingCodeLength,
      style: theme.textTheme.headlineSmall?.copyWith(
        letterSpacing: 4,
        fontWeight: FontWeight.w600,
      ),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9]')),
        _UpperCaseTextFormatter(),
      ],
      textInputAction: TextInputAction.go,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        labelText: l10n.meetingCode,
        hintText: l10n.enterMeetingCode,
        counterText: '',
        errorText: showError ? l10n.invalidMeetingCode : null,
        prefixIcon: const Icon(Icons.meeting_room_outlined),
        suffixIcon: code.isEmpty
            ? null
            : IconButton(
                tooltip: l10n.clearMeetingCode,
                onPressed: enabled
                    ? () {
                        controller.clear();
                        onChanged('');
                      }
                    : null,
                icon: const Icon(Icons.clear),
              ),
        border: const OutlineInputBorder(),
        helperText: isValid ? null : l10n.enterMeetingCode,
      ),
    );
  }
}

class _UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}
