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

public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionCompletedReceipts;
    protected override string ExchangeName => EventQueues.TransactionExchange;
    protected override string RoutingKey   => "transaction.completed";

    public TransactionCompletedConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<TransactionCompletedConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task HandleAsync(TransactionCompletedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IReceiptRepository>();

        if (await repo.ExistsByTransactionIdAsync(message.TransactionId))
            return;

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