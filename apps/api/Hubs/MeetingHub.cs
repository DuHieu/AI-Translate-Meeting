using Microsoft.AspNetCore.SignalR;
using AITranslateMeeting.Api.Models;

namespace AITranslateMeeting.Api.Hubs;

public class MeetingHub : Hub
{
    private readonly ILogger<MeetingHub> _logger;

    public MeetingHub(ILogger<MeetingHub> logger)
    {
        _logger = logger;
    }

    public async Task JoinRoom(string meetingId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, meetingId);
        _logger.LogInformation("Connection {ConnectionId} joined SignalR room {MeetingId}", Context.ConnectionId, meetingId);
    }

    public async Task SendSubtitle(SubtitleMessage message)
    {
        await Clients.Group(message.MeetingId).SendAsync("ReceiveSubtitle", message);
    }
}
