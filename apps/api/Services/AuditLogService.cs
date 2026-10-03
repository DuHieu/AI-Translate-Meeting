using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public sealed record AuditEventRecord(
    Guid Id,
    string EventType,
    string? MeetingId,
    string? ParticipantId,
    string Details,
    DateTime TimestampUtc
);

public interface IAuditLogService
{
    void LogEvent(string eventType, string? meetingId, string? participantId, string details);
    IReadOnlyList<AuditEventRecord> GetRecentEvents(int limit = 50);
}

public sealed class AuditLogService : IAuditLogService
{
    private const int MaxEvents = 200;
    private readonly ConcurrentQueue<AuditEventRecord> _events = new();
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(ILogger<AuditLogService> logger)
    {
        _logger = logger;
    }

    public void LogEvent(string eventType, string? meetingId, string? participantId, string details)
    {
        // Sanitize: never allow secrets or tokens in details
        var sanitizedDetails = Sanitize(details);

        var record = new AuditEventRecord(
            Id: Guid.NewGuid(),
            EventType: eventType,
            MeetingId: meetingId,
            ParticipantId: participantId,
            Details: sanitizedDetails,
            TimestampUtc: DateTime.UtcNow
        );

        _events.Enqueue(record);

        while (_events.Count > MaxEvents && _events.TryDequeue(out _))
        {
            // Bounded circular queue retention
        }

        _logger.LogInformation(
            "AUDIT [{EventType}] meeting={MeetingId} participant={ParticipantId} - {Details}",
            eventType,
            meetingId ?? "none",
            participantId ?? "none",
            sanitizedDetails
        );
    }

    public IReadOnlyList<AuditEventRecord> GetRecentEvents(int limit = 50)
    {
        var clamped = Math.Clamp(limit, 1, MaxEvents);
        return _events
            .ToArray()
            .OrderByDescending(e => e.TimestampUtc)
            .Take(clamped)
            .ToList();
    }

    private static string Sanitize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        // Strip out any potential JWT tokens or Bearer prefixes
        var sanitized = System.Text.RegularExpressions.Regex.Replace(
            input,
            @"eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+",
            "[REDACTED_JWT]"
        );
        sanitized = System.Text.RegularExpressions.Regex.Replace(
            sanitized,
            @"Bearer\s+[a-zA-Z0-9\._\-]+",
            "Bearer [REDACTED_TOKEN]",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );
        return sanitized;
    }
}
