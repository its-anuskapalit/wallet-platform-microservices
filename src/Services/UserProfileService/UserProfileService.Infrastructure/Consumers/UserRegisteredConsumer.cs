using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Shared.Contracts;
using Shared.Contracts.Events;
using Shared.EventBus;
using Shared.EventBus.Options;
using UserProfileService.Core.Entities;
using UserProfileService.Core.Interfaces;

namespace UserProfileService.Infrastructure.Consumers;

/// <summary>
/// RabbitMQ consumer that listens for <c>user.registered</c> events and automatically
/// creates a <see cref="UserProfile"/> for each newly registered user.
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
    /// Creates a user profile for the registered user if one does not already exist.
    /// </summary>
    /// <param name="message">The user-registered event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(UserRegisteredEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IProfileRepository>();

        if (await repo.ExistsByUserIdAsync(message.UserId))
            return;

        await repo.AddAsync(new UserProfile
        {
            UserId   = message.UserId,
            Email    = message.Email,
            FullName = message.FullName,
            Phone    = message.Phone
        });

        await repo.SaveChangesAsync();
    }
}