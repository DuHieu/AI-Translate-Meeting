import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/app_config.dart';
import '../../../core/models/meeting.dart';
import '../../../core/utils/validators.dart';
import '../../../l10n/app_localizations.dart';
import '../../../l10n/app_localizations_ext.dart';
import '../../prejoin/screens/prejoin_screen.dart';
import '../providers/home_provider.dart';
import '../widgets/meeting_code_field.dart';
import '../widgets/recent_meetings_list.dart';

/// Home screen — create / join meeting entry point.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _navigateToPrejoin(MeetingDetails meeting) async {
    if (!mounted) return;
    ref.read(homeProvider.notifier).clearNavigationResult();
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PrejoinScreen(
          meetingCode: meeting.meetingCode,
          meeting: meeting,
        ),
      ),
    );
  }

  Future<void> _onJoinPressed() async {
    final code = Validators.normalizeMeetingCode(_codeController.text);
    final meeting =
        await ref.read(homeProvider.notifier).checkMeetingCode(code);
    if (meeting != null) {
      await _navigateToPrejoin(meeting);
    }
  }

  Future<void> _onCreatePressed() async {
    final meeting = await ref.read(homeProvider.notifier).createQuickMeeting();
    if (meeting != null) {
      _codeController.text = meeting.meetingCode;
      await _navigateToPrejoin(meeting);
    }
  }

  Future<void> _onRejoin(RecentMeeting recent) async {
    _codeController.text = recent.meetingCode;
    setState(() {});
    final meeting = await ref
        .read(homeProvider.notifier)
        .checkMeetingCode(recent.meetingCode);
    if (meeting != null) {
      await _navigateToPrejoin(meeting);
    }
  }

  void _showErrorSnackBar(String message) {
    final messenger = ScaffoldMessenger.of(context);
    messenger
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
    final homeState = ref.watch(homeProvider);
    final code = _codeController.text;
    final canJoin = Validators.isValidMeetingCode(code) && !homeState.isBusy;

    ref.listen<HomeState>(homeProvider, (previous, next) {
      if (next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage) {
        _showErrorSnackBar(l10n.errorForKey(next.errorMessage));
      }
    });

    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primaryContainer,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(
                              Icons.video_call_outlined,
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              l10n.appName,
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      Text(
                        l10n.homeTitle,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.homeSubtitle,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: homeState.isBusy ? null : _onCreatePressed,
                          icon: homeState.isCreating
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.add_circle_outline),
                          label: Text(
                            homeState.isCreating
                                ? l10n.creatingMeeting
                                : l10n.createNewMeeting,
                          ),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      Text(
                        l10n.joinByCode,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      MeetingCodeField(
                        controller: _codeController,
                        enabled: !homeState.isBusy,
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (_) {
                          if (canJoin) {
                            _onJoinPressed();
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.tonalIcon(
                          onPressed: canJoin ? _onJoinPressed : null,
                          icon: homeState.isChecking
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.login),
                          label: Text(
                            homeState.isChecking
                                ? l10n.loading
                                : l10n.joinMeeting,
                          ),
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      if (homeState.errorMessage != null) ...[
                        const SizedBox(height: 16),
                        _ErrorBanner(
                          message: l10n.errorForKey(homeState.errorMessage),
                          onDismiss: () =>
                              ref.read(homeProvider.notifier).clearError(),
                        ),
                      ],
                      const SizedBox(height: 32),
                      RecentMeetingsList(
                        meetings: homeState.recentMeetings,
                        enabled: !homeState.isBusy,
                        onRejoin: _onRejoin,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'v${AppConfig.appVersion}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.outline,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({
    required this.message,
    required this.onDismiss,
  });

  final String message;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.errorContainer,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Icon(
              Icons.error_outline,
              color: theme.colorScheme.onErrorContainer,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onErrorContainer,
                ),
              ),
            ),
            IconButton(
              onPressed: onDismiss,
              icon: Icon(
                Icons.close,
                color: theme.colorScheme.onErrorContainer,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
