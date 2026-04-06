using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ReceiptsService.Core.Entities;
using ReceiptsService.Core.Interfaces;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;

namespace ReceiptsService.Infrastructure.Consumers;

/// <summary>
/// RabbitMQ consumer that listens for <c>transaction.completed</c> events and generates
/// a <see cref="Receipt"/> record for each completed transaction if one does not already exist.
/// </summary>
public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionCompletedReceipts;
    protected override string ExchangeName => EventQueues.TransactionExchange;
    protected override string RoutingKey   => "transaction.completed";

    /// <summary>
    /// Initializes a new instance of <see cref="TransactionCompletedConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public TransactionCompletedConsumer(IOptions<RabbitMqOptions> options,ILogger<TransactionCompletedConsumer> logger,IServiceScopeFactory scopeFactory): base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Creates a receipt for the completed transaction, skipping duplicate processing
    /// if a receipt for that transaction already exists.
    /// </summary>
    /// <param name="message">The transaction-completed event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(TransactionCompletedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IReceiptRepository>();

        if (await repo.ExistsByTransactionIdAsync(message.TransactionId))
          {  return;
          }
        await repo.AddAsync(new Receipt
        {
            TransactionId    = message.TransactionId,
            SenderUserId     = message.SenderUserId,
            ReceiverUserId   = message.ReceiverUserId,
            SenderWalletId   = message.SenderWalletId,
            ReceiverWalletId = message.ReceiverWalletId,
            Amount           = message.Amount,
            Currency         = message.Currency,
            TransactionType  = message.TransactionType,
            TransactionDate  = message.CompletedAt
        });

        await repo.SaveChangesAsync();
    }
}