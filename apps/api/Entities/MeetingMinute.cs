namespace AITranslateMeeting.Api.Entities;

public sealed class MeetingMinute
{
    public Guid Id { get; set; }
    public Guid MeetingId { get; set; }
    public Meeting Meeting { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Summary { get; set; } = null!;
    public string MarkdownContent { get; set; } = null!;
    public string DecisionsJson { get; set; } = "[]";
    public string ActionItemsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; }
}
