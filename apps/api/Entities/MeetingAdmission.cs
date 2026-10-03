namespace AITranslateMeeting.Api.Entities;

public sealed class MeetingAdmission
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public string Type { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? SpokenLanguage { get; set; }
    public string? TargetLanguage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? DecidedAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
    public Meeting Meeting { get; set; } = null!;
}
