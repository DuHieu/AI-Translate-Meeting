import '../models/meeting.dart';
import '../models/participant.dart';
import '../utils/logger.dart';
import '../utils/validators.dart';
import 'api_client.dart';

/// API endpoints for meeting operations
abstract class MeetingApi {
  factory MeetingApi(ApiClient client) = MeetingApiImpl;

  Future<MeetingDetails> getMeeting(String code);
  Future<CreateMeetingResponse> createMeeting({String? title});
  Future<JoinResponse> joinMeeting(String code, JoinRequest request);
  Future<void> leaveMeeting(String code, {required String participantId});
  Future<List<Participant>> getParticipants(String code);
  Future<bool> checkHealth();
}

class MeetingApiImpl implements MeetingApi {
  MeetingApiImpl(this._client);

  final ApiClient _client;

  @override
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

  @override
  Future<CreateMeetingResponse> createMeeting({String? title}) async {
    try {
      final name =
          (title == null || title.trim().isEmpty) ? 'Laya Meet' : title.trim();
      AppLogger.d('Creating meeting: $name');

      final response = await _client.post(
        '/api/meetings',
        data: {'name': name},
      );

      return CreateMeetingResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } catch (e, stackTrace) {
      AppLogger.e('Failed to create meeting', e, stackTrace);
      rethrow;
    }
  }

  @override
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

  @override
  Future<void> leaveMeeting(String code,
      {required String participantId}) async {
    try {
      final normalizedCode = Validators.normalizeMeetingCode(code);
      AppLogger.d('Leaving meeting: $normalizedCode');

      await _client.post(
        '/api/meetings/$normalizedCode/leave',
        data: {'participantId': participantId},
      );

      AppLogger.d('Left meeting successfully');
    } catch (e, stackTrace) {
      AppLogger.e('Failed to leave meeting', e, stackTrace);
      rethrow;
    }
  }

  @override
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

  @override
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
