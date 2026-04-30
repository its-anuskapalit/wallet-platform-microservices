using Microsoft.Extensions.DependencyInjection;
using Shared.EventBus.Options;

namespace Shared.EventBus;

/// <summary>
/// Extension methods for registering event-bus services in the dependency-injection container.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="RabbitMqEventPublisher"/> as the singleton <see cref="IEventPublisher"/> implementation.
    /// </summary>
    /// <param name="services">The service collection to add the publisher to.</param>
    /// <returns>The same <see cref="IServiceCollection"/> for chaining.</returns>
    public static IServiceCollection AddEventBus(this IServiceCollection services)
    {
        services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();
        return services;
    }
    /// <summary>
    /// Binds <see cref="RabbitMqOptions"/> from an inline configuration delegate.
    /// </summary>
    /// <param name="services">The service collection to configure.</param>
    /// <param name="configure">A delegate that sets RabbitMQ connection properties.</param>
    /// <returns>The same <see cref="IServiceCollection"/> for chaining.</returns>
    public static IServiceCollection AddRabbitMqOptions( this IServiceCollection services,Action<RabbitMqOptions> configure)
    {
        services.Configure(configure);
        return services;
    }
}