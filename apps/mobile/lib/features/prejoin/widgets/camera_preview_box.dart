import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';

import '../../../l10n/app_localizations.dart';

/// Local camera preview with mute/camera toggles and mic-level feedback.
///
/// Preview uses LiveKit [LocalVideoTrack] without publishing to a room.
/// Falls back to an avatar tile when camera is off or unavailable.
class CameraPreviewBox extends StatefulWidget {
  const CameraPreviewBox({
    required this.showCamera,
    required this.isMicEnabled,
    required this.micLevel,
    required this.displayName,
    required this.onToggleCamera,
    required this.onToggleMic,
    this.enableLivePreview = true,
    super.key,
  });

  final bool showCamera;
  final bool isMicEnabled;
  final double micLevel;
  final String displayName;
  final VoidCallback onToggleCamera;
  final VoidCallback onToggleMic;
  final bool enableLivePreview;

  @override
  State<CameraPreviewBox> createState() => _CameraPreviewBoxState();
}

class _CameraPreviewBoxState extends State<CameraPreviewBox> {
  LocalVideoTrack? _track;
  bool _starting = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _syncPreview();
  }

  @override
  void didUpdateWidget(covariant CameraPreviewBox oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.showCamera != widget.showCamera ||
        oldWidget.enableLivePreview != widget.enableLivePreview) {
      _syncPreview();
    }
  }

  @override
  void dispose() {
    _disposeTrack();
    super.dispose();
  }

  Future<void> _syncPreview() async {
    if (!widget.showCamera || !widget.enableLivePreview) {
      await _disposeTrack();
      if (mounted) {
        setState(() {
          _failed = false;
          _starting = false;
        });
      }
      return;
    }

    if (_track != null || _starting) return;

    setState(() {
      _starting = true;
      _failed = false;
    });

    try {
      final track = await LocalVideoTrack.createCameraTrack(
        const CameraCaptureOptions(
          cameraPosition: CameraPosition.front,
        ),
      );
      if (!mounted) {
        await track.stop();
        await track.dispose();
        return;
      }
      setState(() {
        _track = track;
        _starting = false;
        _failed = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _track = null;
        _starting = false;
        _failed = true;
      });
    }
  }

  Future<void> _disposeTrack() async {
    final track = _track;
    _track = null;
    if (track != null) {
      await track.stop();
      await track.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final initials = _initials(widget.displayName);

    return AspectRatio(
      aspectRatio: 3 / 4,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: theme.colorScheme.surfaceContainerHighest,
              child: _buildPreviewContent(theme, l10n, initials),
            ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Row(
                children: [
                  Expanded(
                    child: _MicLevelBar(
                      enabled: widget.isMicEnabled,
                      level: widget.micLevel,
                      label: l10n.micLevel,
                    ),
                  ),
                  const SizedBox(width: 12),
                  _RoundToggle(
                    tooltip: widget.showCamera ? l10n.cameraOn : l10n.cameraOff,
                    icon:
                        widget.showCamera ? Icons.videocam : Icons.videocam_off,
                    active: widget.showCamera,
                    onPressed: widget.onToggleCamera,
                  ),
                  const SizedBox(width: 8),
                  _RoundToggle(
                    tooltip: widget.isMicEnabled ? l10n.micOn : l10n.micOff,
                    icon: widget.isMicEnabled ? Icons.mic : Icons.mic_off,
                    active: widget.isMicEnabled,
                    onPressed: widget.onToggleMic,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewContent(
    ThemeData theme,
    AppLocalizations l10n,
    String initials,
  ) {
    if (_starting) {
      return const Center(child: CircularProgressIndicator());
    }

    if (widget.showCamera && _track != null) {
      return VideoTrackRenderer(_track!);
    }

    return Semantics(
      label: widget.showCamera ? l10n.cameraUnavailable : l10n.cameraOff,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircleAvatar(
            radius: 42,
            backgroundColor: theme.colorScheme.primaryContainer,
            child: Text(
              initials,
              style: theme.textTheme.headlineMedium?.copyWith(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            widget.showCamera && _failed
                ? l10n.cameraUnavailable
                : (widget.displayName.isEmpty
                    ? l10n.displayName
                    : widget.displayName),
            style: theme.textTheme.titleMedium,
          ),
        ],
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

class _RoundToggle extends StatelessWidget {
  const _RoundToggle({
    required this.tooltip,
    required this.icon,
    required this.active,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final bool active;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Tooltip(
      message: tooltip,
      child: Material(
        color: active
            ? theme.colorScheme.primary
            : theme.colorScheme.errorContainer,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(
              icon,
              color: active
                  ? theme.colorScheme.onPrimary
                  : theme.colorScheme.onErrorContainer,
            ),
          ),
        ),
      ),
    );
  }
}

class _MicLevelBar extends StatelessWidget {
  const _MicLevelBar({
    required this.enabled,
    required this.level,
    required this.label,
  });

  final bool enabled;
  final double level;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Semantics(
      label: label,
      value: enabled ? '${(level * 100).round()}%' : '0%',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: enabled ? level.clamp(0.0, 1.0) : 0,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surface.withOpacity(0.5),
              color: enabled
                  ? theme.colorScheme.secondary
                  : theme.colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }
}
