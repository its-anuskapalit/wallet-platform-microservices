using LedgerService.Core.Entities;
using LedgerService.Core.Interfaces;
using LedgerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerService.Infrastructure.Repositories;

public class LedgerEntryRepository : ILedgerEntryRepository
{
    private readonly LedgerDbContext _db;

    public LedgerEntryRepository(LedgerDbContext db)
    {
        _db = db;
    }

    public async Task AddRangeAsync(IEnumerable<LedgerEntry> entries) =>
        await _db.LedgerEntries.AddRangeAsync(entries);

    public async Task<IEnumerable<LedgerEntry>> GetByWalletIdAsync(Guid walletId) =>
        await _db.LedgerEntries
            .Where(l => l.WalletId == walletId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}