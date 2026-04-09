using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RewardsService.Core.Entities;
using RewardsService.Core.Interfaces;
using RewardsService.Core.Services;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;

namespace RewardsService.Infrastructure.Consumers;

/// <summary>
/// RabbitMQ consumer that listens for <c>transaction.completed</c> events and awards
/// loyalty points to the sender's rewards account based on the transaction amount.
/// Creates a rewards account on first encounter if none exists.
/// </summary>
public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionCompletedRewards;
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

    /// <summary>
    /// Calculates and awards loyalty points for the completed transaction.
    /// If no rewards account exists for the sender, one is created automatically.
    /// Skips award if the calculated points are zero or negative.
    /// </summary>
    /// <param name="message">The transaction-completed event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(TransactionCompletedEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IRewardsRepository>();

        var account = await repo.GetByUserIdAsync(message.SenderUserId);

        if (account is null)
        {
            account = new RewardsAccount
            {
                UserId = message.SenderUserId,
                Email  = string.Empty
            };
            await repo.AddAsync(account);
        }

        var basePoints = RewardsDomainService.CalculatePoints(message.Amount);

        // Campaign: milestone bonus points for large transfers
        var bonusPoints = 0;
        var bonusDesc   = string.Empty;

        if (message.TransactionType.Equals("Transfer", StringComparison.OrdinalIgnoreCase))
        {
            if (message.Amount >= 5000)
            {
                bonusPoints = 200;
                bonusDesc   = $"🏆 Big Transfer Bonus (+{bonusPoints} pts) for sending ₹{message.Amount}+";
            }
            else if (message.Amount >= 1000)
            {
                bonusPoints = 50;
                bonusDesc   = $"⭐ Milestone Bonus (+{bonusPoints} pts) for sending ₹{message.Amount}+";
            }
        }

        var totalPoints = basePoints + bonusPoints;
        if (totalPoints <= 0) return;

        account.TotalPoints += totalPoints;
        account.Tier         = RewardsDomainService.CalculateTier(account.TotalPoints);
        account.UpdatedAt    = DateTime.UtcNow;

        // Base points entry
        if (basePoints > 0)
        {
            await repo.AddPointsTransactionAsync(new PointsTransaction
            {
                RewardsAccountId = account.Id,
                TransactionId    = message.TransactionId,
                Points           = basePoints,
                Description      = $"Earned {basePoints} pts for {message.TransactionType} of ₹{message.Amount}"
            });
        }

        // Campaign bonus entry (separate line item so user can see it)
        if (bonusPoints > 0)
        {
            await repo.AddPointsTransactionAsync(new PointsTransaction
            {
                RewardsAccountId = account.Id,
                TransactionId    = message.TransactionId,
                Points           = bonusPoints,
                Description      = bonusDesc
            });
        }

        await repo.SaveChangesAsync();
    }
}