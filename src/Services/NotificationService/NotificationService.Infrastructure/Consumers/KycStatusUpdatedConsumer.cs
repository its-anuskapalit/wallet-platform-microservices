using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NotificationService.Core.Enums;
using NotificationService.Core.Services;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;

namespace NotificationService.Infrastructure.Consumers;

/// <summary>
/// RabbitMQ consumer that listens for <c>kyc.status.updated</c> events and sends
/// an approval or rejection email to the affected user.
/// </summary>
public class KycStatusUpdatedConsumer : BaseConsumer<KYCStatusUpdatedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.KYCUpdatedNotification;
    protected override string ExchangeName => EventQueues.UserExchange;
    protected override string RoutingKey   => "kyc.status.updated";

    /// <summary>
    /// Initializes a new instance of <see cref="KycStatusUpdatedConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public KycStatusUpdatedConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<KycStatusUpdatedConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>Sends a KYC approval or rejection email to the user.</summary>
    /// <param name="message">The KYC status updated event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(KYCStatusUpdatedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<NotificationDomainService>();

        var subject = message.Status == "Approved"
            ? "KYC Approved!"
            : "KYC Rejected";

        var body = message.Status == "Approved"
            ? $"<h2>Hi {message.FullName},</h2><p>Your KYC has been <b>approved</b>. You now have full access.</p>"
            : $"<h2>Hi {message.FullName},</h2><p>Your KYC was <b>rejected</b>. Reason: {message.RejectionReason}</p>";

        await svc.SendAsync(
            userId:  message.UserId,
            email:   message.Email,
            subject: subject,
            body:    body,
            type:    NotificationType.KycStatusUpdated);
    }
}