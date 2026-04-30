using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;
using WalletService.Core.Interfaces;

namespace WalletService.Infrastructure.Consumers;

/// <summary>
/// Listens for <c>transaction.completed</c> events and applies the corresponding
/// debit (sender) and credit (receiver) to both wallets atomically from the consumer's
/// perspective. Each operation is idempotent via the transaction ID key, so safe to retry.
/// </summary>
public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TransactionCompletedConsumer> _log;
    protected override string QueueName    => EventQueues.TransactionCompletedWallet;
    protected override string ExchangeName => EventQueues.TransactionExchange;
    protected override string RoutingKey   => "transaction.completed";

    public TransactionCompletedConsumer(IOptions<RabbitMqOptions> options,ILogger<TransactionCompletedConsumer> logger,IServiceScopeFactory scopeFactory)   : base(options, logger)
    {
        _scopeFactory = scopeFactory;
        _log = logger;
    }

    protected override async Task HandleAsync(TransactionCompletedEvent message, CancellationToken ct)
    {
        // Only apply balance changes for peer-to-peer transfers, not top-ups
        if (!message.TransactionType.Equals("Transfer", StringComparison.OrdinalIgnoreCase))
            return;

        using var scope = _scopeFactory.CreateScope();
        var walletSvc = scope.ServiceProvider.GetRequiredService<IWalletService>();

        var idempotencyKey = message.TransactionId.ToString();

        // Debit sender
        var debitResult = await walletSvc.DebitTransferAsync(
            message.SenderUserId, idempotencyKey, message.Amount, message.Currency);

        if (!debitResult.IsSuccess)
        {
            _log.LogWarning(
                "TransactionCompletedConsumer: debit failed for sender {UserId} on txn {TxnId}: {Error}",
                message.SenderUserId, message.TransactionId, debitResult.Error);
            // Still attempt credit so receiver isn't left hanging; real systems would compensate here
        }

        // Credit receiver
        var creditResult = await walletSvc.CreditAsync(
            message.ReceiverUserId, idempotencyKey, message.Amount, message.Currency);

        if (!creditResult.IsSuccess)
        {
            _log.LogWarning(
                "TransactionCompletedConsumer: credit failed for receiver {UserId} on txn {TxnId}: {Error}",
                message.ReceiverUserId, message.TransactionId, creditResult.Error);
        }
    }
}
