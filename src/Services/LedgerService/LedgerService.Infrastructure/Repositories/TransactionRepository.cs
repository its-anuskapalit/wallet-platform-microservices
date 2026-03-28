using LedgerService.Core.Entities;
using LedgerService.Core.Interfaces;
using LedgerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerService.Infrastructure.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly LedgerDbContext _db;

    public TransactionRepository(LedgerDbContext db)
    {
        _db = db;
    }

    public async Task<Transaction?> GetByIdAsync(Guid id) =>
        await _db.Transactions
            .Include(t => t.LedgerEntries)
            .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<Transaction?> GetByIdempotencyKeyAsync(string key) =>
        await _db.Transactions.FirstOrDefaultAsync(t => t.IdempotencyKey == key);

    public async Task<IEnumerable<Transaction>> GetBySenderUserIdAsync(Guid userId) =>
        await _db.Transactions
            .Where(t => t.SenderUserId == userId || t.ReceiverUserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

    public async Task AddAsync(Transaction transaction) =>
        await _db.Transactions.AddAsync(transaction);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}