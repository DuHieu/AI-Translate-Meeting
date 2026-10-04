using System.Text;
using System.Text.Json;
using AITranslateMeeting.Api.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AITranslateMeeting.Api.Services;

public interface INotificationDispatcher
{
    Task DispatchPaymentSuccessAsync(PaymentOrderResponse order, CancellationToken cancellationToken = default);
    Task DispatchEnterpriseLeadAsync(EnterpriseLeadRecord lead, CancellationToken cancellationToken = default);
    Task<bool> SendTestNotificationAsync(string message, CancellationToken cancellationToken = default);
    bool IsTelegramConfigured { get; }
    bool IsWebhookConfigured { get; }
}

public sealed class NotificationDispatcher : INotificationDispatcher
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationDispatcher> _logger;
    private readonly HttpClient _httpClient;

    public NotificationDispatcher(
        IConfiguration configuration,
        ILogger<NotificationDispatcher> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory?.CreateClient("NotificationClient") ?? new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
    }

    private string? TelegramBotToken =>
        _configuration["Telegram:BotToken"] ?? _configuration["TELEGRAM_BOT_TOKEN"];

    private string? TelegramChatId =>
        _configuration["Telegram:ChatId"] ?? _configuration["TELEGRAM_CHAT_ID"];

    private string? WebhookUrl =>
        _configuration["Notification:WebhookUrl"] ?? _configuration["ENTERPRISE_LEAD_WEBHOOK_URL"];

    public bool IsTelegramConfigured =>
        !string.IsNullOrWhiteSpace(TelegramBotToken) && !string.IsNullOrWhiteSpace(TelegramChatId);

    public bool IsWebhookConfigured =>
        !string.IsNullOrWhiteSpace(WebhookUrl) && Uri.TryCreate(WebhookUrl, UriKind.Absolute, out _);

    public async Task DispatchPaymentSuccessAsync(PaymentOrderResponse order, CancellationToken cancellationToken = default)
    {
        var message =
            $"💰 <b>[ViMeet] Thanh toán VIP thành công!</b>\n" +
            $"• Mã đơn: <code>{order.OrderCode}</code>\n" +
            $"• Gói: <b>{order.PlanName}</b>\n" +
            $"• Số tiền: <b>{order.Amount:N0} đ</b>\n" +
            $"• Ngân hàng: {order.BankId} ({order.AccountNumber})\n" +
            $"• Thời gian: {order.CreatedAt:yyyy-MM-dd HH:mm:ss} UTC";

        _logger.LogInformation("Dispatching payment success notification for order {OrderCode} ({Amount} VND)", order.OrderCode, order.Amount);

        await SendTelegramMessageAsync(message, cancellationToken);
        await SendWebhookPayloadAsync("payment.success", order, cancellationToken);
    }

    public async Task DispatchEnterpriseLeadAsync(EnterpriseLeadRecord lead, CancellationToken cancellationToken = default)
    {
        var message =
            $"🏢 <b>[ViMeet] Khách hàng Doanh nghiệp mới!</b>\n" +
            $"• Khách hàng: <b>{lead.FullName}</b>\n" +
            $"• Công ty: <b>{lead.Company ?? "Cá nhân"}</b>\n" +
            $"• Email: <code>{lead.Email}</code>\n" +
            $"• Quy mô: {lead.TeamSize ?? "Chưa rõ"}\n" +
            $"• Cặp ngôn ngữ: {lead.LanguagePair ?? "VI-JA"}\n" +
            $"• Mô hình: {lead.DeploymentModel ?? "On-Premise"}\n" +
            $"• Ghi chú: {lead.Notes ?? "Không có"}\n" +
            $"• Thời gian: {lead.SubmittedAtUtc:yyyy-MM-dd HH:mm:ss} UTC";

        _logger.LogInformation("Dispatching enterprise lead notification for {Email} ({Company})", lead.Email, lead.Company);

        await SendTelegramMessageAsync(message, cancellationToken);
        await SendWebhookPayloadAsync("lead.captured", lead, cancellationToken);
    }

    public async Task<bool> SendTestNotificationAsync(string message, CancellationToken cancellationToken = default)
    {
        var formatted = $"🧪 <b>[ViMeet Test Notification]</b>\n{message}\n<i>Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</i>";
        var tgOk = await SendTelegramMessageAsync(formatted, cancellationToken);
        var whOk = await SendWebhookPayloadAsync("test.ping", new { message, timestamp = DateTime.UtcNow }, cancellationToken);
        return tgOk || whOk;
    }

    private async Task<bool> SendTelegramMessageAsync(string htmlText, CancellationToken cancellationToken)
    {
        if (!IsTelegramConfigured)
        {
            return false;
        }

        try
        {
            var url = $"https://api.telegram.org/bot{TelegramBotToken}/sendMessage";
            var payload = new
            {
                chat_id = TelegramChatId,
                text = htmlText,
                parse_mode = "HTML"
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(url, content, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send Telegram notification");
            return false;
        }
    }

    private async Task<bool> SendWebhookPayloadAsync(string eventType, object data, CancellationToken cancellationToken)
    {
        if (!IsWebhookConfigured)
        {
            return false;
        }

        try
        {
            var payload = new
            {
                event_type = eventType,
                data,
                timestamp = DateTime.UtcNow
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(WebhookUrl!, content, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send webhook notification to {Url}", WebhookUrl);
            return false;
        }
    }
}
