using Microsoft.EntityFrameworkCore;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
using WalletService.Infrastructure.Data;

namespace WalletService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IWalletRepository"/> for the Wallet service.
/// </summary>
public class WalletRepository : IWalletRepository
{
    private readonly WalletDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="WalletRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Wallet service.</param>
    public WalletRepository(WalletDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves the wallet belonging to the specified user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>The matching <see cref="Wallet"/>, or <c>null</c> if not found.</returns>
    public async Task<Wallet?> GetByUserIdAsync(Guid userId) =>
        await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);

    /// <summary>Retrieves a wallet by its own unique identifier.</summary>
    /// <param name="walletId">The wallet's unique identifier.</param>
    /// <returns>The matching <see cref="Wallet"/>, or <c>null</c> if not found.</returns>
    public async Task<Wallet?> GetByIdAsync(Guid walletId) =>
        await _db.Wallets.FirstOrDefaultAsync(w => w.Id == walletId);

    /// <summary>Checks whether a wallet already exists for the given user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns><c>true</c> if a wallet exists; otherwise <c>false</c>.</returns>
    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.Wallets.AnyAsync(w => w.UserId == userId);

    /// <summary>Stages a new <see cref="Wallet"/> entity for insertion.</summary>
    /// <param name="wallet">The wallet to add.</param>
    public async Task AddAsync(Wallet wallet) =>
        await _db.Wallets.AddAsync(wallet);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}