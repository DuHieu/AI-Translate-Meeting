namespace AITranslateMeeting.Api.Entities;

public sealed class Meeting
{
    public Guid Id { get; set; }

    public string MeetingCode { get; set; } = null!;

    public string RoomName { get; set; } = null!;

    public string Name { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public ICollection<MeetingParticipant> Participants { get; set; }
        = new List<MeetingParticipant>();
}
