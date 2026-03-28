using Microsoft.Extensions.DependencyInjection;
using Shared.EventBus.Options;

namespace Shared.EventBus;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddEventBus(this IServiceCollection services)
    {
        services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        return services;
    }

    public static IServiceCollection AddRabbitMqOptions(
        this IServiceCollection services,
        Action<RabbitMqOptions> configure)
    {
        services.Configure(configure);
        return services;
    }
}