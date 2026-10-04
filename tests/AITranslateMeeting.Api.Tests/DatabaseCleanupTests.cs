using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Entities;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public class DatabaseCleanupTests
{
    private readonly AppDbContext _context;
    private readonly Mock<ILogger<DatabaseCleanupService>> _loggerMock = new();
    private readonly DatabaseCleanupService _cleanupService;

    public DatabaseCleanupTests()
    {
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(dbOptions);

        _cleanupService = new DatabaseCleanupService(
            _context,
            _loggerMock.Object,
            TimeProvider.System);
    }

    [Fact]
    public async Task CleanupExpiredRecordsAsync_PurgesOnlyRecordsOlderThanRetentionWindow()
    {
        var now = DateTime.UtcNow;
        var meeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = "CLN123456",
            RoomName = "room-cln",
            Name = "Cleanup Test Meeting",
            CreatedAt = now.AddDays(-3)
        };
        _context.Meetings.Add(meeting);

        var participant = new MeetingParticipant
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Identity = "user-1",
            DisplayName = "User 1",
            SpokenLanguage = "vi",
            TargetLanguage = "ja",
            JoinedAt = now.AddDays(-3)
        };
        _context.MeetingParticipants.Add(participant);

        // 1. Fresh admission (expires in 10 minutes)
        _context.MeetingAdmissions.Add(new MeetingAdmission
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Type = "invite",
            Status = "pending",
            Role = "participant",
            CreatedAt = now.AddMinutes(-5),
            ExpiresAt = now.AddMinutes(10)
        });

        // 2. Expired recently (expired 2 hours ago - within 24h retention)
        _context.MeetingAdmissions.Add(new MeetingAdmission
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Type = "invite",
            Status = "expired",
            Role = "participant",
            CreatedAt = now.AddHours(-3),
            ExpiresAt = now.AddHours(-2)
        });

        // 3. Expired old (expired 30 hours ago - older than 24h retention)
        _context.MeetingAdmissions.Add(new MeetingAdmission
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            Type = "invite",
            Status = "expired",
            Role = "participant",
            CreatedAt = now.AddHours(-35),
            ExpiresAt = now.AddHours(-30)
        });

        // 4. Fresh session (expires in 30 minutes)
        _context.ParticipantSessions.Add(new ParticipantSession
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            ParticipantId = participant.Id,
            Jti = Guid.NewGuid(),
            Role = "participant",
            Scopes = "meeting:read",
            CreatedAt = now.AddMinutes(-30),
            ExpiresAt = now.AddMinutes(30)
        });

        // 5. Expired recently session (expired 2 hours ago)
        _context.ParticipantSessions.Add(new ParticipantSession
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            ParticipantId = participant.Id,
            Jti = Guid.NewGuid(),
            Role = "participant",
            Scopes = "meeting:read",
            CreatedAt = now.AddHours(-3),
            ExpiresAt = now.AddHours(-2)
        });

        // 6. Old expired session (expired 48 hours ago)
        _context.ParticipantSessions.Add(new ParticipantSession
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            ParticipantId = participant.Id,
            Jti = Guid.NewGuid(),
            Role = "participant",
            Scopes = "meeting:read",
            CreatedAt = now.AddHours(-50),
            ExpiresAt = now.AddHours(-48)
        });

        // 7. Old revoked session (revoked 36 hours ago)
        _context.ParticipantSessions.Add(new ParticipantSession
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting.Id,
            ParticipantId = participant.Id,
            Jti = Guid.NewGuid(),
            Role = "participant",
            Scopes = "meeting:read",
            CreatedAt = now.AddHours(-40),
            ExpiresAt = now.AddHours(10),
            RevokedAt = now.AddHours(-36)
        });

        await _context.SaveChangesAsync();

        // Act
        var result = await _cleanupService.CleanupExpiredRecordsAsync(TimeSpan.FromHours(24));

        // Assert
        Assert.Equal(1, result.DeletedAdmissions); // only the 30h old admission
        Assert.Equal(2, result.DeletedSessions);   // 48h expired and 36h revoked sessions

        // Remaining in DB
        Assert.Equal(2, await _context.MeetingAdmissions.CountAsync());
        Assert.Equal(2, await _context.ParticipantSessions.CountAsync());
    }

    [Fact]
    public async Task CleanupExpiredRecordsAsync_WhenNoRecordsMatchCutoff_ReturnsZeroDeleted()
    {
        var result = await _cleanupService.CleanupExpiredRecordsAsync(TimeSpan.FromHours(24));

        Assert.Equal(0, result.DeletedAdmissions);
        Assert.Equal(0, result.DeletedSessions);
        Assert.Equal(0, result.EndedGhostMeetings);
    }

    [Fact]
    public async Task CleanupExpiredRecordsAsync_ReapsGhostMeetingsOlderThanRetentionWindow()
    {
        var now = DateTime.UtcNow;

        // 1. Ghost meeting: 30 hours old, 0 participants
        var ghostMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = "GHOST1",
            RoomName = "room-ghost1",
            Name = "Ghost Meeting",
            CreatedAt = now.AddHours(-30)
        };
        _context.Meetings.Add(ghostMeeting);

        // 2. Abandoned meeting: 30 hours old, participant already left
        var abandonedMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = "ABANDN",
            RoomName = "room-abandn",
            Name = "Abandoned Meeting",
            CreatedAt = now.AddHours(-30)
        };
        _context.Meetings.Add(abandonedMeeting);
        _context.MeetingParticipants.Add(new MeetingParticipant
        {
            Id = Guid.NewGuid(),
            MeetingId = abandonedMeeting.Id,
            Identity = "leaver",
            DisplayName = "Leaver",
            SpokenLanguage = "vi",
            TargetLanguage = "en",
            JoinedAt = now.AddHours(-30),
            LeftAt = now.AddHours(-28)
        });

        // 3. Active old meeting: 30 hours old, but active participant (LeftAt is null)
        var activeOldMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = "ACTOLD",
            RoomName = "room-actold",
            Name = "Active Old Meeting",
            CreatedAt = now.AddHours(-30)
        };
        _context.Meetings.Add(activeOldMeeting);
        _context.MeetingParticipants.Add(new MeetingParticipant
        {
            Id = Guid.NewGuid(),
            MeetingId = activeOldMeeting.Id,
            Identity = "still-in-room",
            DisplayName = "Still In Room",
            SpokenLanguage = "vi",
            TargetLanguage = "en",
            JoinedAt = now.AddHours(-30),
            LeftAt = null
        });

        // 4. Fresh meeting: 2 hours old, 0 participants (within 24h retention window)
        var freshMeeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = "FRESH1",
            RoomName = "room-fresh1",
            Name = "Fresh Meeting",
            CreatedAt = now.AddHours(-2)
        };
        _context.Meetings.Add(freshMeeting);

        await _context.SaveChangesAsync();

        // Act
        var result = await _cleanupService.CleanupExpiredRecordsAsync(TimeSpan.FromHours(24));

        // Assert
        Assert.Equal(2, result.EndedGhostMeetings);

        var ghostInDb = await _context.Meetings.FindAsync(ghostMeeting.Id);
        var abandonedInDb = await _context.Meetings.FindAsync(abandonedMeeting.Id);
        var activeInDb = await _context.Meetings.FindAsync(activeOldMeeting.Id);
        var freshInDb = await _context.Meetings.FindAsync(freshMeeting.Id);

        Assert.NotNull(ghostInDb!.EndedAt);
        Assert.NotNull(abandonedInDb!.EndedAt);
        Assert.Null(activeInDb!.EndedAt);
        Assert.Null(freshInDb!.EndedAt);
    }
}
