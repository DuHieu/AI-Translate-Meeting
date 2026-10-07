namespace AITranslateMeeting.Api.Entities;

public sealed class MeetingFeedback
{
    public Guid Id { get; set; }
    public Guid? MeetingId { get; set; }
    public string MeetingCode { get; set; } = null!;
    public int Rating { get; set; }
    public string? Category { get; set; }
    public string Comment { get; set; } = null!;
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public DateTime CreatedAt { get; set; }
    public Meeting? Meeting { get; set; }
}
