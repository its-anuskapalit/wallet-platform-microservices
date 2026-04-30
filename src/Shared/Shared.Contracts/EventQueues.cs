namespace Shared.Contracts;

public static class EventQueues
{
    // Exchanges
    public const string UserExchange = "user.exchange";
    public const string TransactionExchange = "transaction.exchange";
    public const string WalletExchange = "wallet.exchange";

    // Queues
    public const string WalletCreation = "wallet.creation.queue";
    public const string TransactionCompletedWallet = "transaction.completed.wallet.queue";
    public const string UserRegisteredNotification = "user.registered.notification.queue";
    public const string KYCUpdatedNotification = "kyc.updated.notification.queue";
    public const string TransactionCompletedRewards = "transaction.completed.rewards.queue";
    public const string RewardsUserRegistered       = "rewards.user.registered.queue";
    public const string CatalogExchange             = "catalog.exchange";
    public const string PointsRedeemed              = "points.redeemed.queue";
    public const string TransactionCompletedReceipts = "transaction.completed.receipts.queue";
    public const string TransactionCompletedNotification = "transaction.completed.notification.queue";
    public const string TransactionFailedNotification = "transaction.failed.notification.queue";
    public const string WalletFrozenNotification = "wallet.frozen.notification.queue";

    // Dead Letter-Stores messages that cannot be processed.
    public const string DeadLetterExchange = "dead.letter.exchange";
    public const string DeadLetterQueue = "dead.letter.queue";
}