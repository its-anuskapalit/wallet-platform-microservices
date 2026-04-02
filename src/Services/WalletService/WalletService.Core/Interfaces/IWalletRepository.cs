using WalletService.Core.Entities;

namespace WalletService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="Wallet"/> entities.
/// </summary>
public interface IWalletRepository
{
    /// <summary>Retrieves a wallet by the owning user's identifier.</summary>
    Task<Wallet?> GetByUserIdAsync(Guid userId);

    /// <summary>Retrieves a wallet by its own unique identifier.</summary>
    Task<Wallet?> GetByIdAsync(Guid walletId);

    /// <summary>Returns <c>true</c> if a wallet already exists for the given user.</summary>
    Task<bool> ExistsByUserIdAsync(Guid userId);

    /// <summary>Stages a new wallet for insertion.</summary>
    Task AddAsync(Wallet wallet);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}