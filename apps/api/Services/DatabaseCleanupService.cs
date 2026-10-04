using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public record DatabaseCleanupResult(int DeletedAdmissions, int DeletedSessions, int EndedGhostMeetings = 0);

public interface IDatabaseCleanupService
{
    Task<DatabaseCleanupResult> CleanupExpiredRecordsAsync(TimeSpan retentionWindow, CancellationToken cancellationToken = default);
}

public class DatabaseCleanupService : IDatabaseCleanupService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DatabaseCleanupService> _logger;
    private readonly TimeProvider _timeProvider;

    public DatabaseCleanupService(
        AppDbContext context,
        ILogger<DatabaseCleanupService> logger,
        TimeProvider timeProvider)
    {
        _context = context;
        _logger = logger;
        _timeProvider = timeProvider;
    }

    public async Task<DatabaseCleanupResult> CleanupExpiredRecordsAsync(TimeSpan retentionWindow, CancellationToken cancellationToken = default)
    {
        var cutoff = _timeProvider.GetUtcNow().UtcDateTime.Subtract(retentionWindow);

        int deletedAdmissions;
        int deletedSessions;
        int endedGhostMeetings = 0;

        if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            var expiredAdmissions = await _context.MeetingAdmissions
                .Where(a => a.ExpiresAt < cutoff)
                .ToListAsync(cancellationToken);
            _context.MeetingAdmissions.RemoveRange(expiredAdmissions);
            deletedAdmissions = expiredAdmissions.Count;

            var expiredSessions = await _context.ParticipantSessions
                .Where(s => s.ExpiresAt < cutoff || (s.RevokedAt != null && s.RevokedAt < cutoff))
                .ToListAsync(cancellationToken);
            _context.ParticipantSessions.RemoveRange(expiredSessions);
            deletedSessions = expiredSessions.Count;

            var candidateMeetings = await _context.Meetings
                .Include(m => m.Participants)
                .Where(m => m.EndedAt == null && m.CreatedAt < cutoff)
                .ToListAsync(cancellationToken);

            var ghostMeetings = candidateMeetings
                .Where(m => m.Participants == null || m.Participants.Count == 0 || m.Participants.All(p => p.LeftAt != null))
                .ToList();

            var now = _timeProvider.GetUtcNow().UtcDateTime;
            foreach (var gm in ghostMeetings)
            {
                gm.EndedAt = now;
            }
            endedGhostMeetings = ghostMeetings.Count;

            await _context.SaveChangesAsync(cancellationToken);
        }
        else
        {
            deletedAdmissions = await _context.MeetingAdmissions
                .Where(a => a.ExpiresAt < cutoff)
                .ExecuteDeleteAsync(cancellationToken);

            deletedSessions = await _context.ParticipantSessions
                .Where(s => s.ExpiresAt < cutoff || (s.RevokedAt != null && s.RevokedAt < cutoff))
                .ExecuteDeleteAsync(cancellationToken);

            var ghostMeetingIds = await _context.Meetings
                .Where(m => m.EndedAt == null && m.CreatedAt < cutoff)
                .Where(m => !_context.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.LeftAt == null))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            if (ghostMeetingIds.Count > 0)
            {
                var now = _timeProvider.GetUtcNow().UtcDateTime;
                endedGhostMeetings = await _context.Meetings
                    .Where(m => ghostMeetingIds.Contains(m.Id))
                    .ExecuteUpdateAsync(s => s.SetProperty(m => m.EndedAt, now), cancellationToken);
            }
        }

        _logger.LogInformation(
            "Database cleanup completed: {DeletedAdmissions} admissions, {DeletedSessions} sessions purged, {EndedGhostMeetings} ghost meetings ended (cutoff: {Cutoff})",
            deletedAdmissions,
            deletedSessions,
            endedGhostMeetings,
            cutoff);

        return new DatabaseCleanupResult(deletedAdmissions, deletedSessions, endedGhostMeetings);
    }
}
