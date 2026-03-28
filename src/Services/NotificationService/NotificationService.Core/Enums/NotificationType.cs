namespace NotificationService.Core.Enums;

public enum NotificationType
{
    UserRegistered      = 1,
    KycStatusUpdated    = 2,
    TransactionComplete = 3,
    TransactionFailed   = 4,
    WalletFrozen        = 5
}