using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using NotificationService.Core.DTOs;
using NotificationService.Core.Interfaces;

namespace NotificationService.Infrastructure.Email;

/// <summary>
/// <see cref="IEmailSender"/> implementation that delivers HTML emails via Gmail SMTP
/// using MailKit with STARTTLS on port 587. Credentials are read from application configuration.
/// </summary>
public class GmailSmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<GmailSmtpEmailSender> _logger;

    /// <summary>
    /// Initializes a new instance of <see cref="GmailSmtpEmailSender"/>.
    /// </summary>
    /// <param name="config">Application configuration supplying SMTP credentials and sender identity.</param>
    /// <param name="logger">Logger for recording send outcomes.</param>
    public GmailSmtpEmailSender(IConfiguration config, ILogger<GmailSmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Connects to Gmail SMTP, authenticates, and sends the specified email as an HTML message.
    /// </summary>
    /// <param name="email">The email payload including recipient, subject, and HTML body.</param>
    /// <returns><c>true</c> if the email was delivered successfully; <c>false</c> on any error.</returns>
    public async Task<bool> SendAsync(EmailDto email)
    {
        try
        {
            var fromEmail = _config["Smtp:FromEmail"]!;
            var password  = _config["Smtp:Password"]!;
            var fromName  = _config["Smtp:FromName"] ?? "WalletPlatform";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(MailboxAddress.Parse(email.To));
            message.Subject = email.Subject;

            message.Body = new TextPart("html")
            {
                Text = email.Body
            };

            using var client = new SmtpClient();

            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls); //upgrades the connection
            await client.AuthenticateAsync(fromEmail, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            _logger.LogInformation("Email sent to {Email} — {Subject}", email.To, email.Subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError("Email FAILED to {Email} — Error: {Error}", email.To, ex.ToString());
            return false;
        }
    }
}