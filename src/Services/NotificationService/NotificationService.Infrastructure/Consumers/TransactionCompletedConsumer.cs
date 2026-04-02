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
/// RabbitMQ consumer that listens for <c>transaction.completed</c> events and sends
/// a transaction success notification email to the sender.
/// </summary>
public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionCompletedNotification;
    protected override string ExchangeName => EventQueues.TransactionExchange;
    protected override string RoutingKey   => "transaction.completed";

    /// <summary>
    /// Initializes a new instance of <see cref="TransactionCompletedConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public TransactionCompletedConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<TransactionCompletedConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>Sends a transaction success notification email to the sender.</summary>
    /// <param name="message">The transaction-completed event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(TransactionCompletedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<NotificationDomainService>();

        await svc.SendAsync(
            userId:  message.SenderUserId,
            email:   string.Empty,
            subject: "Transaction Successful",
            body:    $"""
                     <h2>Transaction Successful</h2>
                     <p>Amount: <b>{message.Amount} {message.Currency}</b></p>
                     <p>Type: {message.TransactionType}</p>
                     <p>Transaction ID: {message.TransactionId}</p>
                     """,
            type:    NotificationType.TransactionComplete);
    }
}