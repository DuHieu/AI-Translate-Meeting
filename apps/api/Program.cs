using AITranslateMeeting.Api.Data;
using AITranslateMeeting.Api.Extensions;
using AITranslateMeeting.Api.Health;
using AITranslateMeeting.Api.Hubs;
using AITranslateMeeting.Api.Options;
using AITranslateMeeting.Api.Security;
using AITranslateMeeting.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;
using StackExchange.Redis;
using System.Net;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();

builder.Host.UseSerilog();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 10 * 1024 * 1024; // 10 MB
});

// Configure Options
builder.Services.AddOptions<LiveKitOptions>()
    .Bind(builder.Configuration.GetSection(LiveKitOptions.SectionName))
    .ValidateDataAnnotations()
    .Validate(
        options => Uri.TryCreate(options.InternalUrl, UriKind.Absolute, out _)
            && Uri.TryCreate(options.PublicUrl, UriKind.Absolute, out _),
        "LiveKit URLs must be absolute URIs.")
    .ValidateOnStart();

builder.Services.AddOptions<SubtitleTokenOptions>()
    .Bind(builder.Configuration.GetSection(SubtitleTokenOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<AdmissionTokenOptions>()
    .Bind(builder.Configuration.GetSection(AdmissionTokenOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddOptions<SessionTokenOptions>()
    .Bind(builder.Configuration.GetSection(SessionTokenOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

if (builder.Environment.IsProduction() || builder.Configuration.GetValue<bool>("Security:EnforceProductionSecrets"))
{
    var liveKitOpts = builder.Configuration.GetSection(LiveKitOptions.SectionName).Get<LiveKitOptions>();
    var subtitleOpts = builder.Configuration.GetSection(SubtitleTokenOptions.SectionName).Get<SubtitleTokenOptions>();
    var admissionOpts = builder.Configuration.GetSection(AdmissionTokenOptions.SectionName).Get<AdmissionTokenOptions>();
    var sessionOpts = builder.Configuration.GetSection(SessionTokenOptions.SectionName).Get<SessionTokenOptions>();

    AITranslateMeeting.Api.Security.SecuritySecretValidator.ValidateProductionSecrets(
        liveKitOpts?.ApiSecret,
        subtitleOpts?.SigningKey,
        admissionOpts?.SigningKey,
        sessionOpts?.SigningKey);
}

// Configure Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add API & Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddAuthorization();

var configuredKnownProxies = builder.Configuration
    .GetSection("ForwardedHeaders:KnownProxies")
    .Get<string[]>() ?? [];
var knownProxyAddresses = new List<IPAddress>(configuredKnownProxies.Length);
foreach (var configuredProxy in configuredKnownProxies)
{
    if (!IPAddress.TryParse(configuredProxy, out var proxyAddress))
    {
        throw new InvalidOperationException(
            $"ForwardedHeaders:KnownProxies contains invalid IP address '{configuredProxy}'.");
    }

    knownProxyAddresses.Add(proxyAddress);
}

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var proxyAddress in knownProxyAddresses)
    {
        options.KnownProxies.Add(proxyAddress);
    }
});

static string ResolveClientIp(HttpContext httpContext)
{
    return ClientIpResolver.Resolve(httpContext);
}

var rateLimitingSection = builder.Configuration.GetSection(RateLimitingOptions.SectionName);
builder.Services.Configure<RateLimitingOptions>(rateLimitingSection);
var rateLimitingOpts = rateLimitingSection.Get<RateLimitingOptions>() ?? new RateLimitingOptions();
var rateLimitMultiplier = Math.Max(1, rateLimitingOpts.Multiplier);

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("CreateMeeting", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ResolveClientIp(context),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = (rateLimitingOpts.PolicyLimits.TryGetValue("CreateMeeting", out var customCreate) ? customCreate : 10) * rateLimitMultiplier,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        }));
    options.AddPolicy("JoinAdmission", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ResolveClientIp(context),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = (rateLimitingOpts.PolicyLimits.TryGetValue("JoinAdmission", out var customJoin) ? customJoin : 30) * rateLimitMultiplier,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        }));
    options.AddPolicy("HostAdmission", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ResolveClientIp(context),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = (rateLimitingOpts.PolicyLimits.TryGetValue("HostAdmission", out var customHost) ? customHost : 120) * rateLimitMultiplier,
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(1)
        }));
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.Headers["Retry-After"] = "60";
        await Results.Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "Too many requests",
            detail: "Please wait before trying the admission operation again.")
            .ExecuteAsync(context.HttpContext);
    };
});

builder.Services.AddScoped<ILiveKitService, LiveKitService>();
builder.Services.AddScoped<ISubtitleTokenService, SubtitleTokenService>();
builder.Services.AddScoped<IAdmissionTokenService, AdmissionTokenService>();
builder.Services.AddScoped<IParticipantSessionService, ParticipantSessionService>();
builder.Services.AddScoped<IDatabaseCleanupService, DatabaseCleanupService>();
builder.Services.AddHostedService<DatabaseCleanupBackgroundService>();
builder.Services.AddScoped<IMeetingService, MeetingService>();
builder.Services.AddScoped<IReadinessEvaluator, ReadinessEvaluator>();
builder.Services.AddSingleton<IAuditLogService, AuditLogService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.Configure<DatabaseCleanupOptions>(builder.Configuration.GetSection(DatabaseCleanupOptions.SectionName));
builder.Services.Configure<HostSecurityOptions>(builder.Configuration.GetSection(HostSecurityOptions.SectionName));
builder.Services.Configure<LicenseOptions>(builder.Configuration.GetSection(LicenseOptions.SectionName));
builder.Services.AddSingleton<ILicenseService, LicenseService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<INotificationDispatcher, NotificationDispatcher>();
builder.Services.AddSingleton<IBillingService, BillingService>();
builder.Services.AddSingleton<ILeadService, LeadService>();
builder.Services.AddScoped<IInfraMetricsService, InfraMetricsService>();
builder.Services.AddHostedService<InfraMonitoringBackgroundService>();

var redisConn = builder.Configuration.GetSection("Redis")["ConnectionString"];
if (!string.IsNullOrWhiteSpace(redisConn))
{
    try
    {
        var redisOptions = ConfigurationOptions.Parse(redisConn);
        redisOptions.AbortOnConnectFail = false;
        redisOptions.ConnectTimeout = 1500;
        redisOptions.SyncTimeout = 1500;
        var multiplexer = ConnectionMultiplexer.Connect(redisOptions);
        builder.Services.AddSingleton<IConnectionMultiplexer>(multiplexer);
    }
    catch
    {
        Log.Warning("Could not initialize Redis multiplexer. Falling back to local rate limiting.");
    }
}
builder.Services.AddSingleton<IDistributedRateLimiter, DistributedRateLimiter>();

const string webClientCorsPolicy = "WebClient";
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray() ?? [];

if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException("At least one Cors:AllowedOrigins entry is required.");
}

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy(webClientCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

var migrateOnly = args.Contains("--migrate-only", StringComparer.OrdinalIgnoreCase);
if (migrateOnly || builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

if (migrateOnly)
{
    Log.Information("Database migrations completed successfully");
    await Log.CloseAndFlushAsync();
    return;
}

// Clearing the ASP.NET trusted proxy collections means "trust all", not
// "trust none". Do not install the middleware at all unless at least one
// immediate proxy address was explicitly configured.
if (knownProxyAddresses.Count > 0)
{
    app.UseForwardedHeaders();
}
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors(webClientCorsPolicy);
app.UseMiddleware<DistributedRateLimitingMiddleware>();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MeetingHub>("/hubs/meeting");

app.MapGet("/health/live", () => Results.Ok(new { status = "live", healthy = true }));

app.MapGet("/health/ready", async (
    IReadinessEvaluator evaluator,
    IHostEnvironment environment,
    CancellationToken cancellationToken) =>
{
    var health = await evaluator.EvaluateAsync(cancellationToken);

    if (health.IsReady(environment.IsProduction()))
    {
        return Results.Ok(new
        {
            status = "ready",
            database = health.DatabaseStatus,
            redis = health.RedisStatus
        });
    }

    return Results.Problem(
        statusCode: StatusCodes.Status503ServiceUnavailable,
        title: "Service unavailable",
        detail: "One or more required dependencies are unavailable.",
        extensions: new Dictionary<string, object?>
        {
            ["database"] = health.DatabaseStatus,
            ["redis"] = health.RedisStatus
        });
});

app.MapGet("/health", async (
    IReadinessEvaluator evaluator,
    CancellationToken cancellationToken) =>
{
    var health = await evaluator.EvaluateAsync(cancellationToken);

    if (health.IsHealthy)
    {
        return Results.Ok(new
        {
            status = "healthy",
            database = health.DatabaseStatus,
            redis = health.RedisStatus
        });
    }

    return Results.Problem(
        statusCode: StatusCodes.Status503ServiceUnavailable,
        title: "Service unavailable",
        detail: "One or more dependencies are unavailable.",
        extensions: new Dictionary<string, object?>
        {
            ["database"] = health.DatabaseStatus,
            ["redis"] = health.RedisStatus
        });
});

app.Run();

public partial class Program;
