using System.Globalization;
using System.Text;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AITranslateMeeting.Api.Services;

public interface IMeetingScheduleService
{
    Task<MeetingScheduleDto> GetMeetingScheduleAsync(string meetingCode, CancellationToken ct = default);
    Task<IReadOnlyList<MeetingScheduleDto>> GetUpcomingScheduledMeetingsAsync(string? email = null, CancellationToken ct = default);
    Task<SubmitRsvpResponseDto> SubmitRsvpAsync(string meetingCode, SubmitRsvpRequestDto request, CancellationToken ct = default);
    Task<string> GenerateCalendarIcsAsync(string meetingCode, CancellationToken ct = default);
}

public sealed partial class MeetingService : IMeetingScheduleService
{
    public async Task<MeetingScheduleDto> GetMeetingScheduleAsync(
        string meetingCode,
        CancellationToken ct = default)
    {
        var code = meetingCode?.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .AsNoTracking()
            .Include(item => item.Rsvps)
            .FirstOrDefaultAsync(item => item.MeetingCode == code, ct)
            ?? throw new KeyNotFoundException($"Meeting with code '{meetingCode}' was not found.");

        return ToMeetingSchedule(meeting);
    }

    public async Task<IReadOnlyList<MeetingScheduleDto>> GetUpcomingScheduledMeetingsAsync(
        string? email = null,
        CancellationToken ct = default)
    {
        var cutoff = UtcNow().AddHours(-2);
        var normalizedEmail = NormalizeEmail(email);
        var query = _context.Meetings
            .AsNoTracking()
            .Where(item => item.EndedAt == null
                && item.ScheduledStartAt != null
                && item.ScheduledStartAt >= cutoff);

        if (normalizedEmail != null)
        {
            query = query.Where(item =>
                (item.HostEmail != null && item.HostEmail.ToLower() == normalizedEmail)
                || item.Rsvps.Any(rsvp => rsvp.Email != null && rsvp.Email.ToLower() == normalizedEmail));
        }

        var meetings = await query
            .Include(item => item.Rsvps)
            .OrderBy(item => item.ScheduledStartAt)
            .Take(20)
            .ToListAsync(ct);

        return meetings.Select(ToMeetingSchedule).ToList();
    }

    public async Task<SubmitRsvpResponseDto> SubmitRsvpAsync(
        string meetingCode,
        SubmitRsvpRequestDto request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, true, ct);
        ReactivateMeetingIfEnded(meeting);
        var (displayName, email, status, spokenLanguage, targetLanguage) = ValidateRsvpInput(request);
        var now = UtcNow();

        MeetingRsvp? rsvp = null;
        if (email != null)
        {
            rsvp = await _context.MeetingRsvps.FirstOrDefaultAsync(
                item => item.MeetingId == meeting.Id && item.Email == email,
                ct);
        }

        if (rsvp == null)
        {
            rsvp = new MeetingRsvp
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                CreatedAt = now
            };
            _context.MeetingRsvps.Add(rsvp);
        }

        rsvp.DisplayName = displayName;
        rsvp.Email = email;
        rsvp.Status = status;
        rsvp.SpokenLanguage = spokenLanguage;
        rsvp.TargetLanguage = targetLanguage;
        rsvp.UpdatedAt = now;

        MeetingAdmission? admission = null;
        string? admissionToken = null;
        if (status is "going" or "maybe")
        {
            var expiresAt = meeting.ScheduledEndAt is { } scheduledEndAt && scheduledEndAt > now
                ? scheduledEndAt.AddHours(4)
                : now.AddHours(24);
            admission = new MeetingAdmission
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                Type = "invite",
                Status = "approved",
                Role = "participant",
                DisplayName = displayName,
                SpokenLanguage = spokenLanguage,
                TargetLanguage = targetLanguage,
                CreatedAt = now,
                ExpiresAt = expiresAt
            };
            _context.MeetingAdmissions.Add(admission);
            rsvp.AdmissionId = admission.Id;
            admissionToken = _admissionTokenService.GenerateInviteToken(
                meeting.Id,
                admission.Id,
                admission.ExpiresAt);
        }
        else
        {
            rsvp.AdmissionId = null;
        }

        await _context.SaveChangesAsync(ct);

        return new SubmitRsvpResponseDto(
            rsvp.Id,
            meeting.MeetingCode,
            rsvp.DisplayName,
            rsvp.Status,
            rsvp.SpokenLanguage,
            rsvp.TargetLanguage,
            admissionToken,
            admission?.ExpiresAt);
    }

    public async Task<string> GenerateCalendarIcsAsync(
        string meetingCode,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        if (!meeting.ScheduledStartAt.HasValue)
            throw new InvalidOperationException($"Meeting '{meetingCode}' is not scheduled.");

        var startsAt = NormalizeUtc(meeting.ScheduledStartAt.Value);
        var endsAt = meeting.ScheduledEndAt.HasValue
            ? NormalizeUtc(meeting.ScheduledEndAt.Value)
            : startsAt.AddMinutes(45);
        var spokenLanguage = meeting.DefaultSpokenLanguage ?? "vi";
        var targetLanguage = meeting.DefaultTargetLanguage ?? "ja";
        var joinLink = $"https://layameet.com/meeting/{meeting.MeetingCode}";
        var description = $"Agenda: {meeting.Agenda ?? "No agenda provided"}\n"
            + $"Language Pair: {spokenLanguage} -> {targetLanguage}\n"
            + $"Join: {joinLink}";

        var lines = new[]
        {
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//LayaMeet//Bilingual AI Meeting//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            $"UID:{meeting.Id:N}@layameet.com",
            $"DTSTAMP:{FormatIcsDateTime(UtcNow())}",
            $"DTSTART:{FormatIcsDateTime(startsAt)}",
            $"DTEND:{FormatIcsDateTime(endsAt)}",
            $"SUMMARY:{EscapeIcsText(meeting.Name)}",
            $"DESCRIPTION:{EscapeIcsText(description)}",
            "BEGIN:VALARM",
            "TRIGGER:-PT15M",
            "ACTION:DISPLAY",
            "DESCRIPTION:LayaMeet starts in 15 minutes",
            "END:VALARM",
            "BEGIN:VALARM",
            "TRIGGER:-PT5M",
            "ACTION:DISPLAY",
            "DESCRIPTION:LayaMeet starts in 5 minutes",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR"
        };

        return string.Join("\r\n", lines.SelectMany(FoldIcsLine)) + "\r\n";
    }

    private static MeetingScheduleDto ToMeetingSchedule(Meeting meeting)
    {
        var attendees = meeting.Rsvps
            .OrderByDescending(item => item.UpdatedAt)
            .Select(item => new RsvpAttendeeDto(
                item.Id,
                item.DisplayName,
                item.Status,
                item.SpokenLanguage,
                item.TargetLanguage,
                item.UpdatedAt))
            .ToList();

        return new MeetingScheduleDto(
            meeting.Id,
            meeting.MeetingCode,
            meeting.Name,
            meeting.CreatedAt,
            meeting.EndedAt,
            meeting.ScheduledStartAt,
            meeting.ScheduledEndAt,
            meeting.Timezone ?? "Asia/Ho_Chi_Minh",
            meeting.Agenda,
            meeting.DefaultSpokenLanguage ?? "vi",
            meeting.DefaultTargetLanguage ?? "ja",
            meeting.DomainGlossary ?? "general",
            attendees.Count(item => item.Status == "going"),
            attendees.Count(item => item.Status == "maybe"),
            attendees.Count(item => item.Status == "declined"),
            attendees);
    }

    private static (string DisplayName, string? Email, string Status, string SpokenLanguage, string TargetLanguage)
        ValidateRsvpInput(SubmitRsvpRequestDto request)
    {
        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(request.DisplayName));
        if (displayName.Length > 100)
            throw new ArgumentException("Display name cannot exceed 100 characters.", nameof(request.DisplayName));

        var status = request.Status?.Trim().ToLowerInvariant();
        if (status is not ("going" or "maybe" or "declined"))
            throw new ArgumentException("RSVP status must be 'going', 'maybe', or 'declined'.", nameof(request.Status));

        var spokenLanguage = NormalizeRequiredLanguage(
            request.SpokenLanguage,
            ValidSpokenLanguages,
            nameof(request.SpokenLanguage));
        var targetLanguage = NormalizeRequiredLanguage(
            request.TargetLanguage,
            ValidLanguages,
            nameof(request.TargetLanguage));

        return (displayName, NormalizeEmail(request.Email), status, spokenLanguage, targetLanguage);
    }

    private static string FormatIcsDateTime(DateTime value) =>
        NormalizeUtc(value).ToString("yyyyMMdd'T'HHmmss'Z'", CultureInfo.InvariantCulture);

    private static string EscapeIcsText(string value) => value
        .Replace("\\", "\\\\", StringComparison.Ordinal)
        .Replace("\r\n", "\n", StringComparison.Ordinal)
        .Replace('\r', '\n')
        .Replace("\n", "\\n", StringComparison.Ordinal)
        .Replace(";", "\\;", StringComparison.Ordinal)
        .Replace(",", "\\,", StringComparison.Ordinal);

    private static IEnumerable<string> FoldIcsLine(string line)
    {
        const int maxBytes = 75;
        var current = new StringBuilder();
        var currentBytes = 0;
        var textElements = StringInfo.GetTextElementEnumerator(line);

        while (textElements.MoveNext())
        {
            var element = (string)textElements.Current;
            var elementBytes = Encoding.UTF8.GetByteCount(element);
            if (currentBytes + elementBytes > maxBytes && current.Length > 0)
            {
                yield return current.ToString();
                current.Clear();
                current.Append(' ');
                currentBytes = 1;
            }

            current.Append(element);
            currentBytes += elementBytes;
        }

        yield return current.ToString();
    }
}
