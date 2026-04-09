using Shared.Common;
using WalletService.Core.DTOs;

namespace WalletService.Core.Interfaces;

/// <summary>
/// Defines wallet management operations including balance enquiry, top-up, deduction, and freeze/unfreeze.
/// </summary>
public interface IWalletService
{
    /// <summary>Retrieves the wallet belonging to the specified user.</summary>
    Task<Result<WalletDto>> GetWalletAsync(Guid userId);

    /// <summary>Adds funds to the user's wallet using an idempotency key to prevent duplicates.</summary>
    Task<Result<WalletDto>> TopUpAsync(Guid userId, TopUpDto dto);

    /// <summary>Deducts funds from the user's wallet using an idempotency key to prevent duplicates.</summary>
    Task<Result<WalletDto>> DeductAsync(Guid userId, DeductDto dto);

    /// <summary>Freezes the user's wallet, blocking further debit or credit operations.</summary>
    Task<Result<WalletDto>> FreezeAsync(Guid userId, FreezeDto dto);

    /// <summary>Restores a frozen wallet to active status.</summary>
    Task<Result<WalletDto>> UnfreezeAsync(Guid userId);

    /// <summary>
    /// Credits funds to a wallet identified by userId. Used by the TransactionCompletedConsumer
    /// to apply the receiver side of a completed transfer.
    /// </summary>
    Task<Result<WalletDto>> CreditAsync(Guid userId, string idempotencyKey, decimal amount, string currency);

    /// <summary>
    /// Debits funds from a wallet for an inter-service transfer. Unlike DeductAsync, this
    /// accepts an external idempotency key (the transactionId) so the consumer can be safely retried.
    /// </summary>
    Task<Result<WalletDto>> DebitTransferAsync(Guid userId, string idempotencyKey, decimal amount, string currency);
}