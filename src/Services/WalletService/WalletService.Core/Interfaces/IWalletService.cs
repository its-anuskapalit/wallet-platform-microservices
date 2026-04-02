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
}