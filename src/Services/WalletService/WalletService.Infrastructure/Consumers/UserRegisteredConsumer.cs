using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;

namespace WalletService.Infrastructure.Consumers;

public class UserRegisteredConsumer : BaseConsumer<UserRegisteredEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.WalletCreation;
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
        var repo = scope.ServiceProvider.GetRequiredService<IWalletRepository>();

        if (await repo.ExistsByUserIdAsync(message.UserId))
            return;

        await repo.AddAsync(new Wallet
        {
            UserId   = message.UserId,
            Email    = message.Email,
            FullName = message.FullName,
            Balance  = 0,
            Currency = "INR"
        });

        await repo.SaveChangesAsync();
    }
}