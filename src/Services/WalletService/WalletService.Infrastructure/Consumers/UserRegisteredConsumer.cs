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

/// <summary>
/// RabbitMQ consumer that listens for <c>user.registered</c> events and automatically
/// creates a default INR wallet for each newly registered user.
/// Uses a scoped service factory to resolve the repository per message.
/// </summary>
public class UserRegisteredConsumer : BaseConsumer<UserRegisteredEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.WalletCreation;
    protected override string ExchangeName => EventQueues.UserExchange;
    protected override string RoutingKey   => "user.registered";

    /// <summary>
    /// Initializes a new instance of <see cref="UserRegisteredConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public UserRegisteredConsumer(
        IOptions<RabbitMqOptions> options,
        ILogger<UserRegisteredConsumer> logger,
        IServiceScopeFactory scopeFactory)
        : base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Creates a new wallet for the registered user if one does not already exist.
    /// </summary>
    /// <param name="message">The user-registered event payload.</param>
    /// <param name="ct">Cancellation token.</param>
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