using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace AITranslateMeeting.Api.Services;

public interface IMeetingService
{
    Task<CreateMeetingResponseDto> CreateMeetingAsync(CreateMeetingRequestDto request, CancellationToken ct = default);
    Task<MeetingDetailsDto> GetMeetingAsync(string meetingCode, CancellationToken ct = default);
    Task<JoinMeetingResponseDto> JoinMeetingAsync(string meetingCode, JoinMeetingRequestDto request, CancellationToken ct = default);
    Task LeaveMeetingAsync(string meetingCode, LeaveMeetingRequestDto request, CancellationToken ct = default);
    Task<IEnumerable<ParticipantDto>> GetActiveParticipantsAsync(string meetingCode, CancellationToken ct = default);
}

public class MeetingService : IMeetingService
{
    private static readonly HashSet<string> ValidLanguages = new(StringComparer.OrdinalIgnoreCase) { "vi", "en", "ja" };
    private const string AllowedChars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 unambiguous chars

    private readonly AppDbContext _context;
    private readonly ILiveKitService _liveKitService;
    private readonly ILogger<MeetingService> _logger;

    public MeetingService(
        AppDbContext context,
        ILiveKitService liveKitService,
        ILogger<MeetingService> logger)
    {
        _context = context;
        _liveKitService = liveKitService;
        _logger = logger;
    }

    public async Task<CreateMeetingResponseDto> CreateMeetingAsync(CreateMeetingRequestDto request, CancellationToken ct = default)
    {
        var trimmedName = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedName))
        {
            throw new ArgumentException("Meeting name cannot be empty or whitespace.", nameof(request.Name));
        }

        if (trimmedName.Length > 200)
        {
            throw new ArgumentException("Meeting name cannot exceed 200 characters.", nameof(request.Name));
        }

        string meetingCode;
        int attempts = 0;
        do
        {
            meetingCode = GenerateMeetingCode();
            attempts++;
            if (attempts > 20) throw new InvalidOperationException("Failed to generate a unique meeting code.");
        }
        while (await _context.Meetings.AnyAsync(m => m.MeetingCode == meetingCode, ct));

        var roomName = $"meeting_{meetingCode}";

        var meeting = new Meeting
        {
            Id = Guid.NewGuid(),
            MeetingCode = meetingCode,
            RoomName = roomName,
            Name = trimmedName,
            CreatedAt = DateTime.UtcNow
        };

        _context.Meetings.Add(meeting);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Created meeting {MeetingCode} (ID: {MeetingId})", meeting.MeetingCode, meeting.Id);

        return new CreateMeetingResponseDto(
            meeting.Id,
            meeting.MeetingCode,
            meeting.RoomName,
            meeting.Name,
            meeting.CreatedAt
        );
    }

    public async Task<MeetingDetailsDto> GetMeetingAsync(string meetingCode, CancellationToken ct = default)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MeetingCode == code, ct);

        if (meeting == null)
        {
            throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");
        }

        return new MeetingDetailsDto(
            meeting.Id,
            meeting.MeetingCode,
            meeting.RoomName,
            meeting.Name,
            meeting.CreatedAt,
            meeting.EndedAt
        );
    }

    public async Task<JoinMeetingResponseDto> JoinMeetingAsync(string meetingCode, JoinMeetingRequestDto request, CancellationToken ct = default)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .FirstOrDefaultAsync(m => m.MeetingCode == code, ct);

        if (meeting == null)
        {
            throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");
        }

        if (meeting.EndedAt != null)
        {
            throw new InvalidOperationException($"Meeting '{meetingCode}' has already ended.");
        }

        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new ArgumentException("Display name cannot be empty.", nameof(request.DisplayName));
        }

        var spokenLang = request.SpokenLanguage?.Trim().ToLowerInvariant();
        var targetLang = request.TargetLanguage?.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(spokenLang) || !ValidLanguages.Contains(spokenLang))
        {
            throw new ArgumentException("Spoken language must be 'vi', 'en', or 'ja'.", nameof(request.SpokenLanguage));
        }

        if (string.IsNullOrEmpty(targetLang) || !ValidLanguages.Contains(targetLang))
        {
            throw new ArgumentException("Target language must be 'vi', 'en', or 'ja'.", nameof(request.TargetLanguage));
        }

        var identity = $"p_{Guid.NewGuid():N}";
        var participantId = Guid.NewGuid();
        var joinedAt = DateTime.UtcNow;

        var participant = new MeetingParticipant
        {
            Id = participantId,
            MeetingId = meeting.Id,
            Identity = identity,
            DisplayName = displayName,
            SpokenLanguage = spokenLang,
            TargetLanguage = targetLang,
            JoinedAt = joinedAt
        };

        _context.MeetingParticipants.Add(participant);
        await _context.SaveChangesAsync(ct);

        var token = _liveKitService.GenerateAccessToken(meeting.RoomName, identity, displayName);
        var liveKitUrl = _liveKitService.GetPublicUrl();

        _logger.LogInformation("Participant {Identity} ({DisplayName}) joined meeting {MeetingCode}", identity, displayName, code);

        return new JoinMeetingResponseDto(
            meeting.Id,
            meeting.MeetingCode,
            participant.Id,
            participant.Identity,
            participant.DisplayName,
            participant.SpokenLanguage,
            participant.TargetLanguage,
            liveKitUrl,
            token,
            participant.JoinedAt
        );
    }

    public async Task LeaveMeetingAsync(string meetingCode, LeaveMeetingRequestDto request, CancellationToken ct = default)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MeetingCode == code, ct);

        if (meeting == null)
        {
            throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");
        }

        var participant = await _context.MeetingParticipants
            .FirstOrDefaultAsync(p => p.Id == request.ParticipantId && p.MeetingId == meeting.Id, ct);

        if (participant == null)
        {
            throw new KeyNotFoundException($"Participant '{request.ParticipantId}' not found in meeting '{meetingCode}'.");
        }

        if (participant.LeftAt == null)
        {
            participant.LeftAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("Participant {ParticipantId} left meeting {MeetingCode}", request.ParticipantId, code);
        }
    }

    public async Task<IEnumerable<ParticipantDto>> GetActiveParticipantsAsync(string meetingCode, CancellationToken ct = default)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MeetingCode == code, ct);

        if (meeting == null)
        {
            throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");
        }

        var activeParticipants = await _context.MeetingParticipants
            .AsNoTracking()
            .Where(p => p.MeetingId == meeting.Id && p.LeftAt == null)
            .OrderBy(p => p.JoinedAt)
            .Select(p => new ParticipantDto(
                p.Id,
                p.Identity,
                p.DisplayName,
                p.SpokenLanguage,
                p.TargetLanguage,
                p.JoinedAt
            ))
            .ToListAsync(ct);

        return activeParticipants;
    }

    private static string GenerateMeetingCode()
    {
        var chars = new char[6];
        var bytes = new byte[6];
        RandomNumberGenerator.Fill(bytes);

        for (int i = 0; i < 6; i++)
        {
            chars[i] = AllowedChars[bytes[i] % AllowedChars.Length];
        }

        return new string(chars);
    }
}
