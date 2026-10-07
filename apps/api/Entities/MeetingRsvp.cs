namespace AITranslateMeeting.Api.Entities;

public sealed class MeetingRsvp
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public string DisplayName { get; set; } = null!;
    public string? Email { get; set; }
    public string Status { get; set; } = null!;
    public string SpokenLanguage { get; set; } = null!;
    public string TargetLanguage { get; set; } = null!;
    public Guid? AdmissionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Meeting Meeting { get; set; } = null!;
}
