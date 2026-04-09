namespace AuthService.Core.Interfaces;

public interface IEmailSender
{
    Task<bool> SendAsync(string to, string subject, string htmlBody);
}
