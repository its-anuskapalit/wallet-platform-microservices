using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using Shared.EventBus.Options;

namespace Shared.EventBus;

public abstract class BaseConsumer<T> : BackgroundService where T : class
{
    private readonly ILogger _logger;
    private IConnection? _connection;
    private IModel? _channel;
    private readonly RabbitMqOptions _options;
    protected abstract string QueueName { get; }
    protected abstract string ExchangeName { get; }
    protected abstract string RoutingKey { get; }
    protected abstract Task HandleAsync(T message, CancellationToken cancellationToken);

    protected BaseConsumer(IOptions<RabbitMqOptions> options, ILogger logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _options.Host,
            Port = _options.Port,
            UserName = _options.Username,
            Password = _options.Password,
            VirtualHost = _options.VirtualHost,
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.ExchangeDeclare(ExchangeName, ExchangeType.Direct, durable: true);

        _channel.QueueDeclare(
            queue: QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: new Dictionary<string, object>
            {
                { "x-dead-letter-exchange", "dead.letter.exchange" },
                { "x-message-ttl", 86400000 } // 24h TTL before DLQ
            });

        _channel.QueueBind(QueueName, ExchangeName, RoutingKey);
        _channel.BasicQos(0, 1, false); // process one at a time

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            try
            {
                var json = Encoding.UTF8.GetString(ea.Body.ToArray());
                var message = JsonSerializer.Deserialize<T>(json);

                if (message is null)
                {
                    _channel.BasicNack(ea.DeliveryTag, false, false);
                    return;
                }

                await HandleAsync(message, stoppingToken);
                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing {EventType}", typeof(T).Name);
                // Nack without requeue → goes to DLQ
                _channel.BasicNack(ea.DeliveryTag, false, false);
            }
        };

        _channel.BasicConsume(QueueName, autoAck: false, consumer);
        return Task.CompletedTask;
    }

    public override void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
        base.Dispose();
    }
}