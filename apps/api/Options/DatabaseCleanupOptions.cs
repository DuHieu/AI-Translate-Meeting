namespace AITranslateMeeting.Api.Options;

public class DatabaseCleanupOptions
{
    public const string SectionName = "DatabaseCleanup";

    public bool Enabled { get; set; } = true;
    public int IntervalHours { get; set; } = 1;
    public int RetentionHours { get; set; } = 24;
}
