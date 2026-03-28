// using System.Text;
// using System.Text.Json;
// using Microsoft.Extensions.Logging;
// using Microsoft.Extensions.Options;
// using RabbitMQ.Client;
// using Shared.EventBus.Options;

// namespace Shared.EventBus;

// public class RabbitMqEventPublisher : IEventPublisher, IDisposable
// {
//     private readonly IConnection _connection;
//     private readonly IModel _channel;
//     private readonly ILogger<RabbitMqEventPublisher> _logger;

//     public RabbitMqEventPublisher(IOptions<RabbitMqOptions> options, ILogger<RabbitMqEventPublisher> logger)
//     {
//         _logger = logger;
//         var opt = options.Value;

//         var factory = new ConnectionFactory
//         {
//             HostName = opt.Host,
//             Port = opt.Port,
//             UserName = opt.Username,
//             Password = opt.Password,
//             VirtualHost = opt.VirtualHost,
//             DispatchConsumersAsync = true
//         };

//         _connection = factory.CreateConnection();
//         _channel = _connection.CreateModel();

//         // Declare dead letter exchange once at startup
//         _channel.ExchangeDeclare(
//             exchange: "dead.letter.exchange",
//             type: ExchangeType.Fanout,
//             durable: true);

//         _channel.QueueDeclare(
//             queue: "dead.letter.queue",
//             durable: true,
//             exclusive: false,
//             autoDelete: false);

//         _channel.QueueBind("dead.letter.queue", "dead.letter.exchange", string.Empty);
//     }

//     public Task PublishAsync<T>(T message, string exchange, string routingKey) where T : class
//     {
//         var json = JsonSerializer.Serialize(message);
//         var body = Encoding.UTF8.GetBytes(json);

//         var props = _channel.CreateBasicProperties();
//         props.Persistent = true;
//         props.ContentType = "application/json";
//         props.MessageId = Guid.NewGuid().ToString();
//         props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

//         _channel.BasicPublish(
//             exchange: exchange,
//             routingKey: routingKey,
//             basicProperties: props,
//             body: body);

//         _logger.LogInformation("Published {EventType} to {Exchange}/{RoutingKey}", typeof(T).Name, exchange, routingKey);
//         return Task.CompletedTask;
//     }

//     public void Dispose()
//     {
//         _channel?.Close();
//         _connection?.Close();
//     }
// }
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using Shared.EventBus.Options;

namespace Shared.EventBus;

public class RabbitMqEventPublisher : IEventPublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly ILogger<RabbitMqEventPublisher> _logger;

    public RabbitMqEventPublisher(IOptions<RabbitMqOptions> options, ILogger<RabbitMqEventPublisher> logger)
    {
        _logger = logger;
        var opt = options.Value;

        var factory = new ConnectionFactory
        {
            HostName         = opt.Host,
            Port             = opt.Port,
            UserName         = opt.Username,
            Password         = opt.Password,
            VirtualHost      = opt.VirtualHost,
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel    = _connection.CreateModel();

        // Declare dead letter exchange once at startup
        _channel.ExchangeDeclare(
            exchange: "dead.letter.exchange",
            type:     ExchangeType.Fanout,
            durable:  true);

        _channel.QueueDeclare(
            queue:      "dead.letter.queue",
            durable:    true,
            exclusive:  false,
            autoDelete: false);

        _channel.QueueBind("dead.letter.queue", "dead.letter.exchange", string.Empty);
    }

    public Task PublishAsync<T>(T message, string exchange, string routingKey) where T : class
    {
        // Always declare the exchange before publishing
        // This is idempotent — safe to call multiple times
        _channel.ExchangeDeclare(
            exchange:   exchange,
            type:       ExchangeType.Direct,
            durable:    true,
            autoDelete: false);

        var json = JsonSerializer.Serialize(message);
        var body = Encoding.UTF8.GetBytes(json);

        var props = _channel.CreateBasicProperties();
        props.Persistent  = true;
        props.ContentType = "application/json";
        props.MessageId   = Guid.NewGuid().ToString();
        props.Timestamp   = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        _channel.BasicPublish(
            exchange:        exchange,
            routingKey:      routingKey,
            basicProperties: props,
            body:            body);

        _logger.LogInformation("Published {EventType} to {Exchange}/{RoutingKey}",
            typeof(T).Name, exchange, routingKey);

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
    }
}