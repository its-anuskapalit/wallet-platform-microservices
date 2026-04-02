namespace Shared.EventBus;

/// <summary>
/// Defines a contract for publishing domain events to a message broker.
/// </summary>
public interface IEventPublisher
{
    /// <summary>
    /// Serializes <paramref name="message"/> and publishes it to the specified exchange and routing key.
    /// </summary>
    /// <typeparam name="T">The event payload type.</typeparam>
    /// <param name="message">The event payload to publish.</param>
    /// <param name="exchange">The broker exchange to publish to.</param>
    /// <param name="routingKey">The routing key that determines which queues receive the message.</param>
    Task PublishAsync<T>(T message, string exchange, string routingKey) where T : class;
}