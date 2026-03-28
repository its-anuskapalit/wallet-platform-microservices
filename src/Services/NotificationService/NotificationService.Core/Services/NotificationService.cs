using NotificationService.Core.DTOs;
using NotificationService.Core.Entities;
using NotificationService.Core.Enums;
using NotificationService.Core.Interfaces;

namespace NotificationService.Core.Services;

public class NotificationDomainService
{
    private readonly IEmailSender _emailSender;
    private readonly INotificationRepository _repo;

    public NotificationDomainService(IEmailSender emailSender, INotificationRepository repo)
    {
        _emailSender = emailSender;
        _repo        = repo;
    }

    public async Task SendAsync(Guid userId, string email, string subject, string body, NotificationType type)
    {
        var success = false;
        string? error = null;

        try
        {
            success = await _emailSender.SendAsync(new EmailDto
            {
                To      = email,
                Subject = subject,
                Body    = body
            });
        }
        catch (Exception ex)
        {
            error = ex.Message;
        }

        await _repo.AddAsync(new NotificationLog
        {
            UserId       = userId,
            Email        = email,
            Subject      = subject,
            Body         = body,
            Type         = type,
            IsSuccess    = success,
            ErrorMessage = error
        });

        await _repo.SaveChangesAsync();
    }
}