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

public class TransactionCompletedConsumer : BaseConsumer<TransactionCompletedEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.TransactionCompletedRewards;
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

        var points = RewardsDomainService.CalculatePoints(message.Amount);
        if (points <= 0) return;

        account.TotalPoints += points;
        account.Tier         = RewardsDomainService.CalculateTier(account.TotalPoints);
        account.UpdatedAt    = DateTime.UtcNow;

        await repo.AddPointsTransactionAsync(new PointsTransaction
        {
            RewardsAccountId = account.Id,
            TransactionId    = message.TransactionId,
            Points           = points,
            Description      = $"Earned {points} points for {message.TransactionType} of {message.Amount} {message.Currency}"
        });

        await repo.SaveChangesAsync();
    }
}