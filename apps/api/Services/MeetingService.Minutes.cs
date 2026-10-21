using System.Text.Json;
using AITranslateMeeting.Api.DTOs;
using AITranslateMeeting.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace AITranslateMeeting.Api.Services;

public interface IMeetingMinutesService
{
    Task<MeetingMinutesResponse> SaveMeetingMinutesAsync(string meetingCode, SaveMeetingMinutesRequest request, CancellationToken ct = default);
    Task<MeetingMinutesResponse> GetMeetingMinutesAsync(string meetingCode, CancellationToken ct = default);
    Task<IReadOnlyList<MeetingHistoryItemDto>> GetMeetingHistoryAsync(string? email = null, CancellationToken ct = default);
    Task<MeetingFeedbackResponseDto> SubmitFeedbackAsync(string meetingCode, SubmitMeetingFeedbackRequestDto request, CancellationToken ct = default);
}

public sealed partial class MeetingService : IMeetingMinutesService
{
    public async Task<MeetingMinutesResponse> SaveMeetingMinutesAsync(
        string meetingCode,
        SaveMeetingMinutesRequest request,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        var title = request.Title?.Trim();
        var summary = request.Summary?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Meeting minutes title cannot be empty.", nameof(request.Title));
        if (title.Length > 200)
            throw new ArgumentException("Meeting minutes title cannot exceed 200 characters.", nameof(request.Title));
        if (string.IsNullOrWhiteSpace(summary))
            throw new ArgumentException("Meeting minutes summary cannot be empty.", nameof(request.Summary));
        if (summary.Length > 10000)
            throw new ArgumentException("Meeting minutes summary cannot exceed 10000 characters.", nameof(request.Summary));
        if (string.IsNullOrWhiteSpace(request.MarkdownContent))
            throw new ArgumentException("Meeting minutes Markdown content cannot be empty.", nameof(request.MarkdownContent));

        var decisions = request.Decisions ?? [];
        var actionItems = request.ActionItems ?? [];
        var minutes = await _context.MeetingMinutes
            .FirstOrDefaultAsync(item => item.MeetingId == meeting.Id, ct);

        if (minutes == null)
        {
            minutes = new MeetingMinute
            {
                Id = Guid.NewGuid(),
                MeetingId = meeting.Id,
                CreatedAt = UtcNow()
            };
            _context.MeetingMinutes.Add(minutes);
        }

        minutes.Title = title;
        minutes.Summary = summary;
        minutes.MarkdownContent = request.MarkdownContent;
        minutes.DecisionsJson = JsonSerializer.Serialize(decisions);
        minutes.ActionItemsJson = JsonSerializer.Serialize(actionItems);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Saved meeting minutes {MeetingMinutesId} for meeting {MeetingCode}",
            minutes.Id,
            meeting.MeetingCode);

        return ToMeetingMinutesResponse(minutes, meeting.MeetingCode);
    }

    public async Task<MeetingMinutesResponse> GetMeetingMinutesAsync(
        string meetingCode,
        CancellationToken ct = default)
    {
        var meeting = await FindMeetingAsync(meetingCode, false, ct);
        var minutes = await _context.MeetingMinutes
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.MeetingId == meeting.Id, ct)
            ?? throw new KeyNotFoundException($"Meeting minutes for meeting '{meetingCode}' were not found.");

        return ToMeetingMinutesResponse(minutes, meeting.MeetingCode);
    }

    public async Task<IReadOnlyList<MeetingHistoryItemDto>> GetMeetingHistoryAsync(
        string? email = null,
        CancellationToken ct = default)
    {
        var query = _context.Meetings
            .AsNoTracking()
            .Include(m => m.Participants)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            query = query.Where(m =>
                (m.HostEmail != null && m.HostEmail.ToLower() == normalizedEmail) ||
                m.Participants.Any(p => p.DisplayName.ToLower().Contains(normalizedEmail)));
        }

        var meetings = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var meetingIds = meetings.Select(m => m.Id).ToList();
        var minutesList = await _context.MeetingMinutes
            .AsNoTracking()
            .Where(mm => meetingIds.Contains(mm.MeetingId))
            .ToListAsync(ct);

        var minutesMap = minutesList.ToDictionary(mm => mm.MeetingId);

        var results = new List<MeetingHistoryItemDto>(meetings.Count);
        foreach (var m in meetings)
        {
            minutesMap.TryGetValue(m.Id, out var minute);
            var excerpt = minute != null
                ? (minute.Summary.Length > 160 ? minute.Summary[..160] + "..." : minute.Summary)
                : null;

            results.Add(new MeetingHistoryItemDto(
                MeetingId: m.Id,
                MeetingCode: m.MeetingCode,
                Name: m.Name,
                CreatedAt: m.CreatedAt,
                EndedAt: m.EndedAt,
                HasMinutes: minute != null,
                Title: minute?.Title,
                SummaryExcerpt: excerpt,
                ParticipantCount: m.Participants.Count
            ));
        }

        return results;
    }

    public async Task<MeetingFeedbackResponseDto> SubmitFeedbackAsync(
        string meetingCode,
        SubmitMeetingFeedbackRequestDto request,
        CancellationToken ct = default)
    {
        if (request.Rating < 1 || request.Rating > 5)
        {
            throw new ArgumentOutOfRangeException(nameof(request.Rating), "Rating must be between 1 and 5.");
        }

        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new ArgumentException("Comment cannot be empty.", nameof(request.Comment));
        }

        var normalizedCode = meetingCode.Trim().ToUpperInvariant();
        var meeting = await _context.Meetings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.MeetingCode == normalizedCode, ct);

        var feedback = new MeetingFeedback
        {
            Id = Guid.NewGuid(),
            MeetingId = meeting?.Id,
            MeetingCode = normalizedCode,
            Rating = request.Rating,
            Category = request.Category?.Trim(),
            Comment = request.Comment.Trim(),
            UserName = request.UserName?.Trim(),
            UserEmail = request.UserEmail?.Trim()?.ToLowerInvariant(),
            CreatedAt = UtcNow()
        };

        _context.MeetingFeedbacks.Add(feedback);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Meeting feedback saved to database: Meeting={MeetingCode}, Rating={Rating}, Category={Category}",
            normalizedCode,
            feedback.Rating,
            feedback.Category);

        return new MeetingFeedbackResponseDto(
            feedback.Id,
            feedback.MeetingCode,
            feedback.Rating,
            feedback.Category,
            feedback.Comment,
            feedback.UserName,
            feedback.UserEmail,
            feedback.CreatedAt);
    }

    private static MeetingMinutesResponse ToMeetingMinutesResponse(
        MeetingMinute minutes,
        string meetingCode)
    {
        var decisions = JsonSerializer.Deserialize<List<string>>(minutes.DecisionsJson) ?? [];
        var actionItems = JsonSerializer.Deserialize<List<ActionItemDto>>(minutes.ActionItemsJson) ?? [];
        return new MeetingMinutesResponse(
            minutes.Id,
            meetingCode,
            minutes.Title,
            minutes.Summary,
            minutes.MarkdownContent,
            decisions,
            actionItems,
            minutes.CreatedAt);
    }
}
