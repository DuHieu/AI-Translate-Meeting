using AITranslateMeeting.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public record DatabaseCleanupResult(int DeletedAdmissions, int DeletedSessions);

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
        }

        _logger.LogInformation(
            "Database cleanup completed: {DeletedAdmissions} admissions, {DeletedSessions} sessions purged (cutoff: {Cutoff})",
            deletedAdmissions,
            deletedSessions,
            cutoff);

        return new DatabaseCleanupResult(deletedAdmissions, deletedSessions);
    }
}
