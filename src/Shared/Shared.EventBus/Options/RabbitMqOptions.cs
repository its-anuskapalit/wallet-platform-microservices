namespace Shared.EventBus.Options;

/// <summary>
/// Strongly-typed configuration options for establishing a RabbitMQ connection.
/// Bound from the <c>RabbitMq</c> section of application settings.
/// </summary>
public class RabbitMqOptions
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string VirtualHost { get; set; } = "/";

    /// <summary>Gets or sets the number of times a failed publish or consume operation is retried.</summary>
    public int RetryCount { get; set; } = 3;
}