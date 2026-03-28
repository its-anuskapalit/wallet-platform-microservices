namespace Shared.EventBus;

public interface IEventPublisher
{
    Task PublishAsync<T>(T message, string exchange, string routingKey) where T : class;
}