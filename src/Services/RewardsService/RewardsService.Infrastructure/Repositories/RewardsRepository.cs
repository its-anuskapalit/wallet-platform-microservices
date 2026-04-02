using Microsoft.EntityFrameworkCore;
using RewardsService.Core.Entities;
using RewardsService.Core.Interfaces;
using RewardsService.Infrastructure.Data;

namespace RewardsService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="IRewardsRepository"/> for the Rewards service.
/// </summary>
public class RewardsRepository : IRewardsRepository
{
    private readonly RewardsDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="RewardsRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Rewards service.</param>
    public RewardsRepository(RewardsDbContext db)
    {
        _db = db;
    }

    /// <summary>Retrieves a rewards account by user identifier, including its points transaction history.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns>The matching <see cref="RewardsAccount"/> with points transactions, or <c>null</c> if not found.</returns>
    public async Task<RewardsAccount?> GetByUserIdAsync(Guid userId) =>
        await _db.RewardsAccounts
            .Include(r => r.PointsTransactions)
            .FirstOrDefaultAsync(r => r.UserId == userId);

    /// <summary>Checks whether a rewards account already exists for the given user.</summary>
    /// <param name="userId">The user's unique identifier.</param>
    /// <returns><c>true</c> if an account exists; otherwise <c>false</c>.</returns>
    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.RewardsAccounts.AnyAsync(r => r.UserId == userId);

    /// <summary>Stages a new <see cref="RewardsAccount"/> entity for insertion.</summary>
    /// <param name="account">The rewards account to add.</param>
    public async Task AddAsync(RewardsAccount account) =>
        await _db.RewardsAccounts.AddAsync(account);

    /// <summary>Stages a new <see cref="PointsTransaction"/> entity for insertion.</summary>
    /// <param name="transaction">The points transaction record to add.</param>
    public async Task AddPointsTransactionAsync(PointsTransaction transaction) =>
        await _db.PointsTransactions.AddAsync(transaction);

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}