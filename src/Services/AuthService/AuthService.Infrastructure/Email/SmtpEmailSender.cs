using AuthService.Core.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace AuthService.Infrastructure.Email;

/// <summary>
/// Sends HTML email via Gmail SMTP (port 587 / STARTTLS).
/// Credentials are read from Smtp:FromEmail and Smtp:Password in configuration.
/// Falls back to console logging when credentials are not configured (development).
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _log;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> log)
    {
        _config = config;
        _log    = log;
    }

    public async Task<bool> SendAsync(string to, string subject, string htmlBody)
    {
        var fromEmail = _config["Smtp:FromEmail"];
        var password  = _config["Smtp:Password"];

        if (string.IsNullOrWhiteSpace(fromEmail) || string.IsNullOrWhiteSpace(password))
        {
            _log.LogWarning(
                "[OTP EMAIL — SMTP not configured] To: {To} | Subject: {Subject} | Body preview: {Preview}",
                to, subject, htmlBody[..Math.Min(200, htmlBody.Length)]);
            return false;
        }

        try
        {
            var fromName = _config["Smtp:FromName"] ?? "WalletPlatform";
            var message  = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body    = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(fromEmail, password);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _log.LogInformation("Email sent to {To} — {Subject}", to, subject);
            return true;
        }
        catch (Exception ex)
        {
            _log.LogError("Email FAILED to {To} — {Error}", to, ex.Message);
            return false;
        }
    }
}
