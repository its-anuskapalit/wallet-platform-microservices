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

public class WalletFrozenConsumer : BaseConsumer<WalletFrozenEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.WalletFrozenNotification;
    protected override string ExchangeName => EventQueues.WalletExchange;
    protected override string RoutingKey   => "wallet.frozen";

    public WalletFrozenConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<WalletFrozenConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

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