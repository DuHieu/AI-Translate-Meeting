using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Extensions;
using AITranslateMeeting.Api.Hubs;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

// Configure Options
builder.Services.Configure<LiveKitOptions>(builder.Configuration.GetSection(LiveKitOptions.SectionName));

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5433;Database=ai_translate_meeting;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add API & Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddAuthorization();

builder.Services.AddScoped<ILiveKitService, LiveKitService>();
builder.Services.AddScoped<IMeetingService, MeetingService>();

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseAuthorization();

app.MapControllers();
app.MapHub<MeetingHub>("/hubs/meeting");

app.MapGet("/health", async (AppDbContext dbContext) =>
{
    try
    {
        var canConnect = await dbContext.Database.CanConnectAsync();
        if (canConnect)
        {
            return Results.Ok(new { status = "healthy" });
        }
        return Results.Json(new { status = "unhealthy", reason = "Database connection failed" }, statusCode: 503);
    }
    catch (Exception ex)
    {
        return Results.Json(new { status = "unhealthy", reason = ex.Message }, statusCode: 503);
    }
});

app.Run();
