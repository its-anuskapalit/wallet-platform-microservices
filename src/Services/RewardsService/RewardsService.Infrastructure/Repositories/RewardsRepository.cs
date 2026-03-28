using Microsoft.EntityFrameworkCore;
using RewardsService.Core.Entities;
using RewardsService.Core.Interfaces;
using RewardsService.Infrastructure.Data;

namespace RewardsService.Infrastructure.Repositories;

public class RewardsRepository : IRewardsRepository
{
    private readonly RewardsDbContext _db;

    public RewardsRepository(RewardsDbContext db)
    {
        _db = db;
    }

    public async Task<RewardsAccount?> GetByUserIdAsync(Guid userId) =>
        await _db.RewardsAccounts
            .Include(r => r.PointsTransactions)
            .FirstOrDefaultAsync(r => r.UserId == userId);

    public async Task<bool> ExistsByUserIdAsync(Guid userId) =>
        await _db.RewardsAccounts.AnyAsync(r => r.UserId == userId);

    public async Task AddAsync(RewardsAccount account) =>
        await _db.RewardsAccounts.AddAsync(account);

    public async Task AddPointsTransactionAsync(PointsTransaction transaction) =>
        await _db.PointsTransactions.AddAsync(transaction);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}