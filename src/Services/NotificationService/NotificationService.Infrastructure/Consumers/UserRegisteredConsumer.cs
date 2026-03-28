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

public class UserRegisteredConsumer : BaseConsumer<UserRegisteredEvent>
{
    private readonly IServiceScopeFactory _scopeFactory;

    protected override string QueueName    => EventQueues.UserRegisteredNotification;
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