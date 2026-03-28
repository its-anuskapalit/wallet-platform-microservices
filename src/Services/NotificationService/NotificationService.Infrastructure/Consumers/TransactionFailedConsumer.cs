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

public class TransactionFailedConsumer : BaseConsumer<TransactionFailedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionFailedNotification;
    protected override string ExchangeName => EventQueues.TransactionExchange;
    protected override string RoutingKey   => "transaction.failed";

    public TransactionFailedConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<TransactionFailedConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task HandleAsync(TransactionFailedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<NotificationDomainService>();

        await svc.SendAsync(
            userId:  message.SenderUserId,
            email:   string.Empty,
            subject: "Transaction Failed",
            body:    $"""
                     <h2>Transaction Failed</h2>
                     <p>Amount: <b>{message.Amount}</b></p>
                     <p>Reason: {message.Reason}</p>
                     <p>Transaction ID: {message.TransactionId}</p>
                     """,
            type:    NotificationType.TransactionFailed);
    }
}