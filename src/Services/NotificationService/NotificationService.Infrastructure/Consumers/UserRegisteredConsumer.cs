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
/// RabbitMQ consumer that listens for <c>user.registered</c> events and sends
/// a welcome email to the newly registered user.
/// </summary>
public class UserRegisteredConsumer : BaseConsumer<UserRegisteredEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.UserRegisteredNotification; //mailbox
    protected override string ExchangeName => EventQueues.UserExchange; //route
    protected override string RoutingKey   => "user.registered"; //which queue reeceives the message

    /// <summary>
    /// Initializes a new instance of <see cref="UserRegisteredConsumer"/>.
    /// </summary>
    /// <param name="options">RabbitMQ connection options.</param>
    /// <param name="logger">Logger for this consumer.</param>
    /// <param name="scopeFactory">Factory used to create DI scopes per message.</param>
    public UserRegisteredConsumer( IOptions<RabbitMqOptions> options,ILogger<UserRegisteredConsumer> logger,IServiceScopeFactory scopeFactory): base(options, logger)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>Sends a welcome email to the newly registered user.</summary>
    /// <param name="message">The user-registered event payload.</param>
    /// <param name="ct">Cancellation token.</param>
    protected override async Task HandleAsync(UserRegisteredEvent message, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<NotificationDomainService>();

        await svc.SendAsync(
            userId:  message.UserId,
            email:   message.Email,
            subject: "Welcome to WalletPlatform!",
            body:    $"""
                     <h2>Welcome, {message.FullName}!</h2>
                     <p>Your account has been created successfully.</p>
                     <p>You can now start using your wallet.</p>
                     """,
            type:    NotificationType.UserRegistered);
    }
}