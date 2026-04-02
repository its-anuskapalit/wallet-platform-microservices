using NotificationService.Core.DTOs;

namespace NotificationService.Core.Interfaces;

/// <summary>
/// Defines a contract for sending transactional emails.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Sends the specified email and returns whether delivery was successful.
    /// </summary>
    /// <param name="email">The email payload including recipient, subject, and HTML body.</param>
    /// <returns><c>true</c> if the email was delivered successfully; <c>false</c> on any error.</returns>
    Task<bool> SendAsync(EmailDto email);
}