using NotificationService.Core.DTOs;

namespace NotificationService.Core.Interfaces;

public interface IEmailSender
{
    Task<bool> SendAsync(EmailDto email);
}