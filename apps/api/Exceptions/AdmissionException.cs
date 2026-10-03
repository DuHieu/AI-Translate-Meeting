namespace AITranslateMeeting.Api.Exceptions;

public sealed class AdmissionException : Exception
{
    public AdmissionException(int statusCode, string code, string title, string? detail = null)
        : base(detail ?? title)
    {
        StatusCode = statusCode;
        Code = code;
        Title = title;
    }

    public int StatusCode { get; }
    public string Code { get; }
    public string Title { get; }
}
