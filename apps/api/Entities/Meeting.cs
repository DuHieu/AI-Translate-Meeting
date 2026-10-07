namespace AITranslateMeeting.Api.Entities;

public sealed class Meeting
{
    public Guid Id { get; set; }

    public string MeetingCode { get; set; } = null!;

    public string RoomName { get; set; } = null!;

    public string Name { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public DateTime? ScheduledStartAt { get; set; }

    public DateTime? ScheduledEndAt { get; set; }

    public string? Timezone { get; set; }

    public string? Agenda { get; set; }

    public string? DefaultSpokenLanguage { get; set; }

    public string? DefaultTargetLanguage { get; set; }

    public string? DomainGlossary { get; set; }

    public string? HostEmail { get; set; }

    public ICollection<MeetingParticipant> Participants { get; set; }
        = new List<MeetingParticipant>();

    public ICollection<MeetingAdmission> Admissions { get; set; }
        = new List<MeetingAdmission>();

    public ICollection<MeetingRsvp> Rsvps { get; set; }
        = new List<MeetingRsvp>();
}
