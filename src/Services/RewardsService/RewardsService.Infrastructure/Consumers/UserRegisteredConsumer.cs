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
/// Awards a 10-point signup bonus when a new user registers.
/// Also creates the rewards account if it doesn't already exist.
/// </summary>
public class UserRegisteredConsumer : BaseConsumer<UserRegisteredEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.RewardsUserRegistered;
    protected override string ExchangeName => EventQueues.UserExchange;
    protected override string RoutingKey   => "user.registered";

    public UserRegisteredConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<UserRegisteredConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task HandleAsync(UserRegisteredEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IRewardsRepository>();

        if (await repo.ExistsByUserIdAsync(message.UserId)) return;

        const int signupBonus = 10;

        var account = new RewardsAccount
        {
            UserId      = message.UserId,
            Email       = message.Email,
            TotalPoints = signupBonus,
            Tier        = RewardsDomainService.CalculateTier(signupBonus)
        };
        await repo.AddAsync(account);

        await repo.AddPointsTransactionAsync(new PointsTransaction
        {
            RewardsAccountId = account.Id,
            TransactionId    = Guid.NewGuid(),
            Points           = signupBonus,
            Description      = "🎉 Welcome bonus — thanks for joining WalletPlatform!"
        });

        await repo.SaveChangesAsync();
    }
}
