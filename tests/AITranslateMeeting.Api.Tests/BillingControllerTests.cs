using AITranslateMeeting.Api.Controllers;
using AITranslateMeeting.Api.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace AITranslateMeeting.Api.Tests;

public sealed class BillingControllerTests
{
    [Fact]
    public void CreateOrder_WithProPlan_GeneratesOrderAndVietQrUrl()
    {
        var controller = CreateController();

        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro",
            "MEET01",
            "customer@example.com",
            "ViMeet Customer"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Matches("^VM[A-Z0-9]+$", order.OrderCode);
        Assert.Equal(499_000, order.Amount);
        Assert.Equal("Gói Team Pro 1 Tháng", order.PlanName);
        Assert.Equal("pending", order.Status);
        Assert.Equal("MB", order.BankId);
        Assert.Equal("0901234567", order.AccountNumber);
        Assert.Equal("CONG TY VIMEET", order.AccountName);
        Assert.Equal(
            $"https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=499000&addInfo={order.OrderCode}&accountName=CONG%20TY%20VIMEET",
            order.QrUrl);
        Assert.InRange(order.CreatedAt, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow);
    }

    [Fact]
    public void GetOrder_AfterCreation_ReturnsPendingOrder()
    {
        var controller = CreateController();
        var created = CreateOrder(controller, "pass");

        var result = controller.GetOrder(created.OrderCode);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal(created.OrderCode, order.OrderCode);
        Assert.Equal(99_000, order.Amount);
        Assert.Equal("Vé Họp Không Giới Hạn 24h", order.PlanName);
        Assert.Equal("pending", order.Status);
    }

    [Fact]
    public async Task Webhook_ForExistingOrder_MarksOrderAsPaid()
    {
        var controller = CreateController();
        var created = CreateOrder(controller, "pro");

        var webhookResult = await controller.Webhook(new PaymentWebhookPayload(
            created.OrderCode,
            created.Amount,
            "paid",
            null));

        var webhookOk = Assert.IsType<OkObjectResult>(webhookResult.Result);
        var webhookOrder = Assert.IsType<PaymentOrderResponse>(webhookOk.Value);
        Assert.Equal("paid", webhookOrder.Status);

        var getResult = controller.GetOrder(created.OrderCode);
        var getOk = Assert.IsType<OkObjectResult>(getResult.Result);
        var storedOrder = Assert.IsType<PaymentOrderResponse>(getOk.Value);
        Assert.Equal("paid", storedOrder.Status);
    }

    [Fact]
    public void GetOrder_WhenOrderDoesNotExist_Returns404ProblemDetails()
    {
        var controller = CreateController();

        var result = controller.GetOrder("VMNOTFOUND");

        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(StatusCodes.Status404NotFound, problem.Status);
    }

    private static PaymentOrderResponse CreateOrder(BillingController controller, string planId)
    {
        var result = controller.CreateOrder(new CreatePaymentOrderRequest(planId, null, null, null));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<PaymentOrderResponse>(ok.Value);
    }

    private static BillingController CreateController()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection()
            .Build();

        return new BillingController(configuration);
    }
}
