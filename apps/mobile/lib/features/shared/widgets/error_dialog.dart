import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';

/// Reusable RFC7807-friendly error dialog with optional retry.
class ErrorDialog extends StatelessWidget {
  const ErrorDialog({
    required this.message,
    this.title,
    this.onRetry,
    super.key,
  });

  final String message;
  final String? title;
  final VoidCallback? onRetry;

  static Future<void> show(
    BuildContext context, {
    required String message,
    String? title,
    VoidCallback? onRetry,
  }) {
    return showDialog<void>(
      context: context,
      builder: (context) => ErrorDialog(
        message: message,
        title: title,
        onRetry: onRetry,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(title ?? l10n.errorTitle),
      content: Text(message),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.cancel),
        ),
        if (onRetry != null)
          FilledButton(
            onPressed: () {
              Navigator.of(context).pop();
              onRetry!();
            },
            child: Text(l10n.retry),
          ),
      ],
    );
  }
}
