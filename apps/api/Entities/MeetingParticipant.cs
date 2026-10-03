namespace AITranslateMeeting.Api.Entities;

public sealed class MeetingParticipant
{
    public Guid Id { get; set; }

    public Guid MeetingId { get; set; }

    public string Identity { get; set; } = null!;

    public string DisplayName { get; set; } = null!;

    public string SpokenLanguage { get; set; } = null!;

    public string TargetLanguage { get; set; } = null!;

    public string Role { get; set; } = "participant";

    public DateTime JoinedAt { get; set; }

    public DateTime? LeftAt { get; set; }

    public Meeting Meeting { get; set; } = null!;
}
