import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/meeting.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/app_localizations_ext.dart';
import '../../meeting_room/screens/meeting_room_screen.dart';
import '../providers/prejoin_provider.dart';
import '../widgets/camera_preview_box.dart';
import '../widgets/language_selector.dart';

/// Pre-join device setup, permissions, and language selection.
class PrejoinScreen extends ConsumerStatefulWidget {
  const PrejoinScreen({
    required this.meetingCode,
    required this.meeting,
    this.enableLivePreview = true,
    super.key,
  });

  final String meetingCode;
  final MeetingDetails meeting;
  final bool enableLivePreview;

  @override
  ConsumerState<PrejoinScreen> createState() => _PrejoinScreenState();
}

class _PrejoinScreenState extends ConsumerState<PrejoinScreen> {
  late final TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(prejoinProvider.notifier).requestInitialPermissions();
    });
  }

  void _syncNameController(PrejoinState state) {
    if (state.isLoadingPreferences) return;
    if (_nameController.text == state.displayName) return;
    if (_nameController.selection.isValid &&
        _nameController.selection.baseOffset !=
            _nameController.selection.extentOffset) {
      return;
    }
    _nameController.value = TextEditingValue(
      text: state.displayName,
      selection: TextSelection.collapsed(offset: state.displayName.length),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _onJoin() async {
    final response = await ref
        .read(prejoinProvider.notifier)
        .joinMeeting(widget.meetingCode);
    if (!mounted || response == null) return;

    ref.read(prejoinProvider.notifier).clearJoinResult();
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => MeetingRoomScreen(
          meetingCode: widget.meetingCode,
          meetingName: widget.meeting.name,
          joinResponse: response,
          cameraEnabled: ref.read(prejoinProvider).isCameraEnabled,
          micEnabled: ref.read(prejoinProvider).isMicEnabled,
        ),
      ),
    );
  }

  Future<void> _showPermissionDialog() async {
    final l10n = AppLocalizations.of(context);
    final shouldOpen = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.permissionRequiredTitle),
        content: Text(l10n.permissionRequiredBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.openSettings),
          ),
        ],
      ),
    );

    if (shouldOpen == true) {
      await ref.read(prejoinProvider.notifier).openAppSettingsPage();
    } else {
      ref.read(prejoinProvider.notifier).clearPermissionPrompt();
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final state = ref.watch(prejoinProvider);

    ref.listen<PrejoinState>(prejoinProvider, (previous, next) {
      if (previous?.isLoadingPreferences != false &&
          !next.isLoadingPreferences) {
        _syncNameController(next);
      }
      if (next.permissionPrompt != PermissionPrompt.none &&
          previous?.permissionPrompt != next.permissionPrompt) {
        _showPermissionDialog();
      }
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        _showError(l10n.errorForKey(next.errorMessage));
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.meeting.name),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(24),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '${l10n.meetingCodeLabel}: ${widget.meetingCode}',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: state.isLoadingPreferences
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  Text(
                    l10n.prejoinTitle,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.prejoinSubtitle,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 20),
                  CameraPreviewBox(
                    showCamera: state.canShowCameraPreview,
                    isMicEnabled: state.isMicEnabled && state.hasMicPermission,
                    micLevel: state.micLevel,
                    displayName: state.displayName,
                    enableLivePreview: widget.enableLivePreview,
                    onToggleCamera: () {
                      ref.read(prejoinProvider.notifier).toggleCamera();
                    },
                    onToggleMic: () {
                      ref.read(prejoinProvider.notifier).toggleMic();
                    },
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _nameController,
                    enabled: !state.isJoining,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: l10n.displayName,
                      hintText: l10n.displayNameHint,
                      border: const OutlineInputBorder(),
                      errorText: state.errorMessage == 'display_name_required'
                          ? l10n.displayNameRequired
                          : null,
                    ),
                    onChanged: (value) {
                      ref.read(prejoinProvider.notifier).setDisplayName(value);
                    },
                  ),
                  const SizedBox(height: 16),
                  LanguageSelector(
                    label: l10n.spokenLanguage,
                    value: state.spokenLanguage,
                    enabled: !state.isJoining,
                    onChanged: (value) {
                      ref
                          .read(prejoinProvider.notifier)
                          .setSpokenLanguage(value);
                    },
                  ),
                  const SizedBox(height: 16),
                  LanguageSelector(
                    label: l10n.targetLanguage,
                    value: state.targetLanguage,
                    enabled: !state.isJoining,
                    onChanged: (value) {
                      ref
                          .read(prejoinProvider.notifier)
                          .setTargetLanguage(value);
                    },
                  ),
                  if (state.errorMessage != null &&
                      state.errorMessage != 'display_name_required') ...[
                    const SizedBox(height: 16),
                    Text(
                      l10n.errorForKey(state.errorMessage),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ],
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: state.canJoin ? _onJoin : null,
                      icon: state.isJoining
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.meeting_room_outlined),
                      label: Text(
                        state.isJoining ? l10n.joiningMeeting : l10n.joinNow,
                      ),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
