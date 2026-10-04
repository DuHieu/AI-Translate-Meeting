using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public record DatabaseCleanupResult(int DeletedAdmissions, int DeletedSessions, int EndedGhostMeetings = 0);

public interface IDatabaseCleanupService
{
    Task<DatabaseCleanupResult> CleanupExpiredRecordsAsync(TimeSpan retentionWindow, CancellationToken cancellationToken = default);
    Task<int> CloseIdleMeetingsAsync(TimeSpan unattendedTimeout, TimeSpan emptyAfterLeaveTimeout, CancellationToken cancellationToken = default);
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

    public async Task<int> CloseIdleMeetingsAsync(
        TimeSpan unattendedTimeout,
        TimeSpan emptyAfterLeaveTimeout,
        CancellationToken cancellationToken = default)
    {
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var unattendedCutoff = now.Subtract(unattendedTimeout);
        var emptyCutoff = now.Subtract(emptyAfterLeaveTimeout);
        var staleCutoff = now.AddHours(-3);

        int endedCount = 0;

        if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            var activeMeetings = await _context.Meetings
                .Include(m => m.Participants)
                .Where(m => m.EndedAt == null)
                .ToListAsync(cancellationToken);

            var idleMeetings = activeMeetings.Where(m =>
            {
                var parts = m.Participants?.ToList() ?? [];
                var hasActive = parts.Any(p => p.LeftAt == null);

                if (!hasActive)
                {
                    // Case 1: Unattended (0 participants joined) older than unattendedCutoff
                    if (parts.Count == 0 && m.CreatedAt < unattendedCutoff) return true;

                    // Case 2: Everyone left, and either created before unattendedCutoff or last left before emptyCutoff
                    if (parts.Count > 0 && (m.CreatedAt < unattendedCutoff || parts.All(p => p.LeftAt != null && p.LeftAt < emptyCutoff))) return true;
                }

                // Case 3: Stale room older than 3 hours with no participant joined in last 3 hours
                if (m.CreatedAt < staleCutoff && !parts.Any(p => p.JoinedAt >= staleCutoff)) return true;

                return false;
            }).ToList();

            foreach (var m in idleMeetings)
            {
                m.EndedAt = now;
                if (m.Participants != null)
                {
                    foreach (var p in m.Participants.Where(p => p.LeftAt == null))
                    {
                        p.LeftAt = now;
                    }
                }
            }

            endedCount = idleMeetings.Count;
            if (endedCount > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            // PostgreSQL implementation
            // 1. Unattended meetings: 0 participants ever, created before unattendedCutoff
            var unattendedIds = await _context.Meetings
                .Where(m => m.EndedAt == null && m.CreatedAt < unattendedCutoff)
                .Where(m => !_context.MeetingParticipants.Any(p => p.MeetingId == m.Id))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            // 2. All left: has participants, none active (LeftAt == null), and no one left within emptyAfterLeaveTimeout
            var allLeftIds = await _context.Meetings
                .Where(m => m.EndedAt == null)
                .Where(m => _context.MeetingParticipants.Any(p => p.MeetingId == m.Id))
                .Where(m => !_context.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.LeftAt == null))
                .Where(m => !_context.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.LeftAt != null && p.LeftAt >= emptyCutoff))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            // 3. Stale meetings: created > 3h ago with no participants joined in the last 3 hours
            var staleIds = await _context.Meetings
                .Where(m => m.EndedAt == null && m.CreatedAt < staleCutoff)
                .Where(m => !_context.MeetingParticipants.Any(p => p.MeetingId == m.Id && p.JoinedAt >= staleCutoff))
                .Select(m => m.Id)
                .ToListAsync(cancellationToken);

            var idleIds = unattendedIds.Concat(allLeftIds).Concat(staleIds).Distinct().ToList();

            if (idleIds.Count > 0)
            {
                // Mark any unclosed participants as left
                await _context.MeetingParticipants
                    .Where(p => idleIds.Contains(p.MeetingId) && p.LeftAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.LeftAt, now), cancellationToken);

                // Mark meetings as ended
                endedCount = await _context.Meetings
                    .Where(m => idleIds.Contains(m.Id))
                    .ExecuteUpdateAsync(s => s.SetProperty(m => m.EndedAt, now), cancellationToken);

                // Revoke active sessions for these meetings
                await _context.ParticipantSessions
                    .Where(s => idleIds.Contains(s.MeetingId) && s.RevokedAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(s => s.RevokedAt, now), cancellationToken);
            }
        }

        if (endedCount > 0)
        {
            _logger.LogInformation("Auto-closed {EndedCount} idle meeting rooms", endedCount);
        }

        return endedCount;
    }
}
