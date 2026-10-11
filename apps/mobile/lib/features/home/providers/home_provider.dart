import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_error_mapper.dart';
import '../../../core/api/meeting_api.dart';
import '../../../core/models/meeting.dart';
import '../../../core/providers/app_providers.dart';
import '../../../core/utils/secure_storage.dart';
import '../../../core/utils/validators.dart';

/// Immutable home-screen state
class HomeState {
  const HomeState({
    this.recentMeetings = const [],
    this.isChecking = false,
    this.isCreating = false,
    this.errorMessage,
    this.errorStatusCode,
    this.resolvedMeeting,
  });

  final List<RecentMeeting> recentMeetings;
  final bool isChecking;
  final bool isCreating;
  final String? errorMessage;
  final int? errorStatusCode;
  final MeetingDetails? resolvedMeeting;

  bool get isBusy => isChecking || isCreating;

  HomeState copyWith({
    List<RecentMeeting>? recentMeetings,
    bool? isChecking,
    bool? isCreating,
    String? errorMessage,
    int? errorStatusCode,
    MeetingDetails? resolvedMeeting,
    bool clearError = false,
    bool clearResolvedMeeting = false,
  }) {
    return HomeState(
      recentMeetings: recentMeetings ?? this.recentMeetings,
      isChecking: isChecking ?? this.isChecking,
      isCreating: isCreating ?? this.isCreating,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      errorStatusCode:
          clearError ? null : (errorStatusCode ?? this.errorStatusCode),
      resolvedMeeting: clearResolvedMeeting
          ? null
          : (resolvedMeeting ?? this.resolvedMeeting),
    );
  }
}

class HomeNotifier extends Notifier<HomeState> {
  MeetingApi get _meetingApi => ref.read(meetingApiProvider);
  SecureStorage get _storage => ref.read(secureStorageProvider);

  @override
  HomeState build() {
    Future<void>.microtask(() async {
      await loadRecentMeetings();
    });
    return const HomeState();
  }

  Future<void> loadRecentMeetings() async {
    final recent = await _storage.getRecentMeetings();
    state = state.copyWith(recentMeetings: recent);
  }

  void clearNavigationResult() {
    state = state.copyWith(clearResolvedMeeting: true, clearError: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  /// Validate code, fetch meeting details, and prepare navigation.
  Future<MeetingDetails?> checkMeetingCode(String code) async {
    final normalized = Validators.normalizeMeetingCode(code);
    if (!Validators.isValidMeetingCode(normalized)) {
      state = state.copyWith(
        errorMessage: 'invalid_meeting_code',
        errorStatusCode: 400,
        clearResolvedMeeting: true,
      );
      return null;
    }

    state = state.copyWith(
      isChecking: true,
      clearError: true,
      clearResolvedMeeting: true,
    );

    try {
      final meeting = await _meetingApi.getMeeting(normalized);
      if (!meeting.isActive) {
        state = state.copyWith(
          isChecking: false,
          errorMessage: 'meeting_ended',
          errorStatusCode: 403,
        );
        return null;
      }

      await _storage.addRecentMeeting(
        RecentMeeting(
          meetingCode: meeting.meetingCode,
          name: meeting.name,
          joinedAt: DateTime.now().toUtc(),
        ),
      );
      final recent = await _storage.getRecentMeetings();

      state = state.copyWith(
        isChecking: false,
        resolvedMeeting: meeting,
        recentMeetings: recent,
        clearError: true,
      );
      return meeting;
    } catch (error) {
      final apiError = ApiErrorMapper.from(error);
      state = state.copyWith(
        isChecking: false,
        errorMessage: _mapErrorKey(apiError),
        errorStatusCode: apiError.statusCode,
      );
      return null;
    }
  }

  /// Create a quick meeting and navigate into pre-join.
  Future<MeetingDetails?> createQuickMeeting({String? title}) async {
    state = state.copyWith(
      isCreating: true,
      clearError: true,
      clearResolvedMeeting: true,
    );

    try {
      final created = await _meetingApi.createMeeting(title: title);
      if (created.hostToken.isNotEmpty) {
        await _storage.saveHostToken(created.hostToken);
      }

      final meeting = MeetingDetails.fromCreateResponse(created);
      await _storage.addRecentMeeting(
        RecentMeeting(
          meetingCode: meeting.meetingCode,
          name: meeting.name,
          joinedAt: DateTime.now().toUtc(),
        ),
      );
      final recent = await _storage.getRecentMeetings();

      state = state.copyWith(
        isCreating: false,
        resolvedMeeting: meeting,
        recentMeetings: recent,
        clearError: true,
      );
      return meeting;
    } catch (error) {
      final apiError = ApiErrorMapper.from(error);
      state = state.copyWith(
        isCreating: false,
        errorMessage: _mapErrorKey(apiError),
        errorStatusCode: apiError.statusCode,
      );
      return null;
    }
  }

  String _mapErrorKey(ApiException error) {
    switch (error.statusCode) {
      case 404:
        return 'meeting_not_found';
      case 403:
        return 'meeting_ended';
      case 401:
        return 'create_meeting_unauthorized';
      case 0:
        if (error.type == ApiExceptionType.network ||
            error.type == ApiExceptionType.timeout) {
          return 'network_error';
        }
        return 'unexpected_error';
      default:
        return 'unexpected_error';
    }
  }
}

final homeProvider =
    NotifierProvider<HomeNotifier, HomeState>(HomeNotifier.new);
