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
/// RabbitMQ consumer that listens for <c>wallet.frozen</c> events and sends
/// a wallet-frozen notification email to the affected user.
/// </summary>
public class WalletFrozenConsumer : BaseConsumer<WalletFrozenEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.WalletFrozenNotification;
    protected override string ExchangeName => EventQueues.WalletExchange;
    protected override string RoutingKey   => "wallet.frozen";

    /// <summary>
    /// Initializes a new instance of <see cref="WalletFrozenConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public WalletFrozenConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<WalletFrozenConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>Sends a wallet-frozen notification email to the user including the freeze reason.</summary>
    /// <param name="message">The wallet-frozen event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(WalletFrozenEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<NotificationDomainService>();

        await svc.SendAsync(
            userId:  message.UserId,
            email:   message.Email,
            subject: "Your Wallet Has Been Frozen",
            body:    $"""
                     <h2>Wallet Frozen</h2>
                     <p>Your wallet has been frozen.</p>
                     <p>Reason: {message.Reason}</p>
                     <p>Please contact support if you have questions.</p>
                     """,
            type:    NotificationType.WalletFrozen);
    }
}