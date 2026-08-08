namespace AITranslateMeeting.Api.Models;

public class SubtitleMessage
{
    public string Id { get; set; } = string.Empty;

    public string MeetingId { get; set; } = string.Empty;

    public string ParticipantId { get; set; } = string.Empty;

    public string ParticipantName { get; set; } = string.Empty;

    public string SourceLanguage { get; set; } = string.Empty;

    public string TargetLanguage { get; set; } = string.Empty;

    public string OriginalText { get; set; } = string.Empty;

    public string TranslatedText { get; set; } = string.Empty;

    public bool IsFinal { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
