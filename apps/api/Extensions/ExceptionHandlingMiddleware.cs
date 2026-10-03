using Microsoft.AspNetCore.Mvc;
using AITranslateMeeting.Api.Exceptions;

namespace AITranslateMeeting.Api.Extensions;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            if (ex is AdmissionException admissionException)
                _logger.LogWarning("Admission request rejected with code {AdmissionCode}", admissionException.Code);
            else
                _logger.LogError(ex, "An unhandled exception occurred: {ExceptionType}", ex.GetType().Name);

            var (status, title) = ex switch
            {
                AdmissionException admission => (admission.StatusCode, admission.Title),
                ArgumentException => (StatusCodes.Status400BadRequest, ex.Message),
                KeyNotFoundException => (StatusCodes.Status404NotFound, ex.Message),
                InvalidOperationException => (StatusCodes.Status409Conflict, ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected server error occurred.")
            };

            var problemDetails = new ProblemDetails
            {
                Status = status,
                Title = title,
                Detail = status == StatusCodes.Status500InternalServerError ? "Internal server error" : ex.Message,
                Instance = context.Request.Path
            };

            if (ex is AdmissionException admissionError)
                problemDetails.Extensions["code"] = admissionError.Code;

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(
                problemDetails,
                options: null,
                contentType: "application/problem+json",
                cancellationToken: context.RequestAborted);
        }
    }
}
