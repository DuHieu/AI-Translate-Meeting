import '../models/meeting.dart';
import '../models/participant.dart';
import '../utils/logger.dart';
import '../utils/validators.dart';
import 'api_client.dart';

/// API endpoints for meeting operations
class MeetingApi {
  final ApiClient _client;

  MeetingApi(this._client);

  /// Get meeting details by code
  Future<MeetingDetails> getMeeting(String code) async {
    try {
      final normalizedCode = Validators.normalizeMeetingCode(code);
      AppLogger.d('Getting meeting: $normalizedCode');

      final response = await _client.get('/api/meetings/$normalizedCode');

      return MeetingDetails.fromJson(response.data as Map<String, dynamic>);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to get meeting', e, stackTrace);
      rethrow;
    }
  }

  /// Join a meeting
  Future<JoinResponse> joinMeeting(
    String code,
    JoinRequest request,
  ) async {
    try {
      final normalizedCode = Validators.normalizeMeetingCode(code);
      AppLogger.d('Joining meeting: $normalizedCode');
      AppLogger.d('Join request: ${request.toJson()}');

      final response = await _client.post(
        '/api/meetings/$normalizedCode/join',
        data: request.toJson(),
      );

      return JoinResponse.fromJson(response.data as Map<String, dynamic>);
    } catch (e, stackTrace) {
      AppLogger.e('Failed to join meeting', e, stackTrace);
      rethrow;
    }
  }

  /// Leave a meeting
  Future<void> leaveMeeting(String code) async {
    try {
      final normalizedCode = Validators.normalizeMeetingCode(code);
      AppLogger.d('Leaving meeting: $normalizedCode');

      await _client.post('/api/meetings/$normalizedCode/leave');

      AppLogger.d('Left meeting successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to leave meeting', e, stackTrace);
      rethrow;
    }
  }

  /// Get active participants in a meeting
  Future<List<Participant>> getParticipants(String code) async {
    try {
      final normalizedCode = Validators.normalizeMeetingCode(code);
      AppLogger.d('Getting participants for meeting: $normalizedCode');

      final response =
          await _client.get('/api/meetings/$normalizedCode/participants');

      final data = response.data as List<dynamic>;
      return data
          .map((json) => Participant.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e, stackTrace) {
      AppLogger.e('Failed to get participants', e, stackTrace);
      rethrow;
    }
  }

  /// Health check endpoint
  Future<bool> checkHealth() async {
    try {
      final response = await _client.get('/health');
      return response.statusCode == 200;
    } catch (e) {
      AppLogger.w('Health check failed', e);
      return false;
    }
  }
}
