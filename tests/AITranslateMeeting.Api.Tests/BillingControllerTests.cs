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
        Assert.Equal(99_000, order.Amount);
        Assert.Equal("Gói LayaMeet Pro 1 Tháng", order.PlanName);
        Assert.Equal("pending", order.Status);
        Assert.Equal("MB", order.BankId);
        Assert.Equal("0901234567", order.AccountNumber);
        Assert.Equal("CONG TY LAYAMEET", order.AccountName);
        Assert.Equal(
            $"https://img.vietqr.io/image/MB-0901234567-compact2.png?amount=99000&addInfo={order.OrderCode}&accountName=CONG%20TY%20LAYAMEET",
            order.QrUrl);
        Assert.InRange(order.CreatedAt, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow);
    }

    [Fact]
    public void CreateOrder_WithoutCustomerEmail_Returns400ProblemDetails()
    {
        var controller = CreateController();

        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro",
            "MEET01",
            null,
            "LayaMeet Customer"));

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal("Account login required", problem.Title);
    }

    [Fact]
    public void CreateOrder_WithCustomerEmailAndAnnualPlan_ReturnsAnnualOrder()
    {
        var controller = CreateController();

        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro_annual",
            "MEET01",
            "  ANNUAL@example.com  ",
            " Annual Customer "));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal(948_000, order.Amount);
        Assert.Equal("pro_annual", order.PlanId);
        Assert.Equal("annual@example.com", order.CustomerEmail);
        Assert.Equal("Annual Customer", order.CustomerName);
    }

    [Fact]
    public void CreateOrder_WithCustomerEmailAnd2YearPlan_Returns2YearOrder()
    {
        var controller = CreateController();

        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro_2year",
            "MEET01",
            "  2year@example.com  ",
            " 2Year Customer "));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal(1_544_000, order.Amount);
        Assert.Equal("pro_2year", order.PlanId);
        Assert.Equal("2year@example.com", order.CustomerEmail);
        Assert.Equal("2Year Customer", order.CustomerName);
    }

    [Fact]
    public void GetOrder_AfterCreation_ReturnsPendingOrder()
    {
        var controller = CreateController();
        var created = CreateOrder(controller, "pro_monthly");

        var result = controller.GetOrder(created.OrderCode);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal(created.OrderCode, order.OrderCode);
        Assert.Equal(99_000, order.Amount);
        Assert.Equal("Gói LayaMeet Pro 1 Tháng", order.PlanName);
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
    public async Task Webhook_ForExistingOrder_ActivatesAccountSubscription()
    {
        var controller = CreateController();
        var customerEmail = $"billing-{Guid.NewGuid():N}@example.com";
        var createResult = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro_annual",
            null,
            customerEmail,
            "Billing Customer"));
        var createOk = Assert.IsType<OkObjectResult>(createResult.Result);
        var created = Assert.IsType<PaymentOrderResponse>(createOk.Value);

        var webhookResult = await controller.Webhook(new PaymentWebhookPayload(
            created.OrderCode,
            created.Amount,
            "paid",
            null));

        Assert.IsType<OkObjectResult>(webhookResult.Result);
        var subscriptionResult = controller.GetSubscription(customerEmail);
        var subscriptionOk = Assert.IsType<OkObjectResult>(subscriptionResult.Result);
        var subscription = Assert.IsType<AccountSubscriptionDto>(subscriptionOk.Value);
        Assert.True(subscription.IsPro);
        Assert.Equal("pro", subscription.Tier);
        Assert.Equal("pro_annual", subscription.ActivePlanId);
        Assert.Equal(created.OrderCode, subscription.LastOrderCode);
        Assert.NotNull(subscription.ExpiresAt);
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

    [Fact]
    public void CreateOrder_WithPolarMethodAndUsd_GeneratesPolarOrderWithUsdAmountAndCheckoutUrl()
    {
        var controller = CreateController();

        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            "pro",
            "MEET-GLOBAL",
            "global-user@example.com",
            "Global Customer",
            PaymentMethod: "polar",
            Currency: "USD"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.StartsWith("PL", order.OrderCode);
        Assert.Equal("polar", order.PaymentMethod);
        Assert.Equal("USD", order.Currency);
        Assert.Equal(4.99m, order.AmountUsd);
        Assert.NotNull(order.CheckoutUrl);
        Assert.Contains(order.OrderCode, order.CheckoutUrl);
        Assert.Equal("POLAR", order.BankId);
    }

    [Fact]
    public async Task PayOsWebhook_ForMatchingOrder_MarksOrderAsPaid()
    {
        var controller = CreateController();
        var created = CreateOrder(controller, "pro");

        var payload = new PayOsWebhookPayload(
            Code: "00",
            Desc: "success",
            Data: new PayOsWebhookData(
                OrderCode: 999999,
                Amount: created.Amount,
                Description: $"Thanh toan don {created.OrderCode}"),
            Signature: null);

        var result = await controller.PayOsWebhook(payload);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal("paid", order.Status);
        Assert.Equal(created.OrderCode, order.OrderCode);
    }

    [Fact]
    public async Task PolarWebhook_ForMatchingOrder_MarksOrderAsPaid()
    {
        var controller = CreateController();
        var created = CreateOrder(controller, "pro");

        var payload = new PolarWebhookPayload(
            Type: "order.created",
            Data: new PolarWebhookData(
                Id: "polar_evt_123",
                Status: "paid",
                Amount: 499,
                Currency: "USD",
                Metadata: new Dictionary<string, string>
                {
                    ["order_code"] = created.OrderCode
                }));

        var result = await controller.PolarWebhook(payload);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var order = Assert.IsType<PaymentOrderResponse>(ok.Value);
        Assert.Equal("paid", order.Status);
        Assert.Equal(created.OrderCode, order.OrderCode);
    }

    [Fact]
    public async Task PayOsWebhook_WhenOrderNotFound_Returns404ProblemDetails()
    {
        var controller = CreateController();

        var payload = new PayOsWebhookPayload(
            Code: "00",
            Desc: "success",
            Data: new PayOsWebhookData(
                OrderCode: 12345678,
                Amount: 99000,
                Description: "Unknown order"),
            Signature: null);

        var result = await controller.PayOsWebhook(payload);
        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    [Fact]
    public async Task PolarWebhook_WhenOrderNotFound_Returns404ProblemDetails()
    {
        var controller = CreateController();

        var payload = new PolarWebhookPayload(
            Type: "order.created",
            Data: new PolarWebhookData(
                Id: "polar_unknown",
                Status: "paid",
                Amount: 499,
                Currency: "USD",
                Metadata: new Dictionary<string, string>
                {
                    ["order_code"] = "PLUNKNOWN"
                }));

        var result = await controller.PolarWebhook(payload);
        var notFound = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status404NotFound, notFound.StatusCode);
    }

    private static PaymentOrderResponse CreateOrder(BillingController controller, string planId)
    {
        var result = controller.CreateOrder(new CreatePaymentOrderRequest(
            planId,
            null,
            $"billing-{Guid.NewGuid():N}@example.com",
            "Billing Customer"));
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
