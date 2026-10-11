import 'package:mobile/core/api/meeting_api.dart';
import 'package:mobile/core/models/meeting.dart';
import 'package:mobile/core/models/participant.dart';

class FakeMeetingApi implements MeetingApi {
  FakeMeetingApi({
    this.meeting,
    this.createResponse,
    this.joinResponse,
    this.getMeetingError,
    this.createError,
    this.joinError,
  });

  MeetingDetails? meeting;
  CreateMeetingResponse? createResponse;
  JoinResponse? joinResponse;
  Object? getMeetingError;
  Object? createError;
  Object? joinError;

  String? lastJoinedCode;
  JoinRequest? lastJoinRequest;

  @override
  Future<MeetingDetails> getMeeting(String code) async {
    if (getMeetingError != null) throw getMeetingError!;
    return meeting ??
        MeetingDetails(
          meetingId: '1',
          meetingCode: code.toUpperCase(),
          name: 'Demo',
          isActive: true,
        );
  }

  @override
  Future<CreateMeetingResponse> createMeeting({String? title}) async {
    if (createError != null) throw createError!;
    return createResponse ??
        CreateMeetingResponse(
          meetingId: '1',
          meetingCode: 'ABC123',
          roomName: 'room',
          name: title ?? 'Laya Meet',
          createdAt: DateTime.utc(2026, 1, 1),
          hostToken: 'host',
        );
  }

  @override
  Future<JoinResponse> joinMeeting(String code, JoinRequest request) async {
    lastJoinedCode = code;
    lastJoinRequest = request;
    if (joinError != null) throw joinError!;
    return joinResponse ??
        const JoinResponse(
          livekitUrl: 'wss://livekit.local',
          livekitToken: 'lk',
          sessionToken: 'session',
          subtitleToken: 'sub',
          participantId: 'p1',
        );
  }

  @override
  Future<void> leaveMeeting(String code, {required String participantId}) async {}

  @override
  Future<List<Participant>> getParticipants(String code) async => const [];

  @override
  Future<bool> checkHealth() async => true;
}
