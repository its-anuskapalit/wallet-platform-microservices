using NotificationService.Core.DTOs;
using NotificationService.Core.Entities;
using NotificationService.Core.Enums;
using NotificationService.Core.Interfaces;

namespace NotificationService.Core.Services;

/// <summary>
/// Sends email notifications via <see cref="IEmailSender"/> and persists a <see cref="NotificationLog"/>
/// record for every attempt, including failures.
/// </summary>
public class NotificationDomainService
{
    private readonly IEmailSender _emailSender;
    private readonly INotificationRepository _repo;
    /// <summary>
    /// Initializes a new instance of <see cref="NotificationDomainService"/>.
    /// </summary>
    /// <param name="emailSender">The email delivery implementation.</param>
    /// <param name="repo">Repository for persisting notification logs.</param>
    public NotificationDomainService(IEmailSender emailSender, INotificationRepository repo)
    {
        _emailSender = emailSender;
        _repo        = repo;
    }
    /// <summary>
    /// Sends an HTML email to the specified recipient and logs the outcome to the database.
    /// Failures are caught and recorded rather than propagated to the caller.
    /// </summary>
    /// <param name="userId">The user's unique identifier for audit purposes.</param>
    /// <param name="email">The recipient email address.</param>
    /// <param name="subject">The email subject line.</param>
    /// <param name="body">The HTML email body.</param>
    /// <param name="type">The notification type used for categorising the log entry.</param>
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
        //// ALWAYS log — regardless of success or failure
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