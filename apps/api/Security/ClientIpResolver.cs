using Microsoft.AspNetCore.Http;

namespace AITranslateMeeting.Api.Security;

public static class ClientIpResolver
{
    public static string Resolve(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
