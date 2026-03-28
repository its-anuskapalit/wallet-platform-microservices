using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using NotificationService.Core.DTOs;
using NotificationService.Core.Interfaces;

namespace NotificationService.Infrastructure.Email;

public class GmailSmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<GmailSmtpEmailSender> _logger;

    public GmailSmtpEmailSender(IConfiguration config, ILogger<GmailSmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

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

            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
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