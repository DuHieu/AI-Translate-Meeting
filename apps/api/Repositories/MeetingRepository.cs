using System.Collections.Concurrent;
using AITranslateMeeting.Api.Entities;

namespace AITranslateMeeting.Api.Repositories;

public interface IMeetingRepository
{
    Task<Meeting> CreateMeetingAsync(Meeting meeting, CancellationToken ct = default);
    Task<Meeting?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Meeting?> GetByCodeAsync(string meetingCode, CancellationToken ct = default);
    Task<MeetingParticipant> AddParticipantAsync(MeetingParticipant participant, CancellationToken ct = default);
    Task<IEnumerable<MeetingParticipant>> GetParticipantsAsync(Guid meetingId, CancellationToken ct = default);
}

public class InMemoryMeetingRepository : IMeetingRepository
{
    private readonly ConcurrentDictionary<Guid, Meeting> _meetings = new();
    private readonly ConcurrentDictionary<Guid, MeetingParticipant> _participants = new();

    public Task<Meeting> CreateMeetingAsync(Meeting meeting, CancellationToken ct = default)
    {
        _meetings[meeting.Id] = meeting;
        return Task.FromResult(meeting);
    }

    public Task<Meeting?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        _meetings.TryGetValue(id, out var meeting);
        return Task.FromResult(meeting);
    }

    public Task<Meeting?> GetByCodeAsync(string meetingCode, CancellationToken ct = default)
    {
        var meeting = _meetings.Values.FirstOrDefault(m => m.MeetingCode.Equals(meetingCode, StringComparison.OrdinalIgnoreCase) || m.Id.ToString().Equals(meetingCode, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(meeting);
    }

    public Task<MeetingParticipant> AddParticipantAsync(MeetingParticipant participant, CancellationToken ct = default)
    {
        _participants[participant.Id] = participant;
        return Task.FromResult(participant);
    }

    public Task<IEnumerable<MeetingParticipant>> GetParticipantsAsync(Guid meetingId, CancellationToken ct = default)
    {
        var result = _participants.Values.Where(p => p.MeetingId == meetingId && p.LeftAt == null);
        return Task.FromResult(result);
    }
}
