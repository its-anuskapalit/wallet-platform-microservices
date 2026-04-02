using LedgerService.Core.Entities;
using LedgerService.Core.Interfaces;
using LedgerService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LedgerService.Infrastructure.Repositories;

/// <summary>
/// Entity Framework Core implementation of <see cref="ILedgerEntryRepository"/> for the Ledger service.
/// Manages double-entry ledger records associated with transactions.
/// </summary>
public class LedgerEntryRepository : ILedgerEntryRepository
{
    private readonly LedgerDbContext _db;

    /// <summary>
    /// Initializes a new instance of <see cref="LedgerEntryRepository"/>.
    /// </summary>
    /// <param name="db">The EF Core database context for the Ledger service.</param>
    public LedgerEntryRepository(LedgerDbContext db)
    {
        _db = db;
    }

    /// <summary>Stages a collection of <see cref="LedgerEntry"/> entities for batch insertion.</summary>
    /// <param name="entries">The ledger entries to add.</param>
    public async Task AddRangeAsync(IEnumerable<LedgerEntry> entries) =>
        await _db.LedgerEntries.AddRangeAsync(entries);

    /// <summary>
    /// Retrieves all ledger entries for the specified wallet, ordered by creation date descending.
    /// </summary>
    /// <param name="walletId">The wallet's unique identifier.</param>
    /// <returns>An ordered list of ledger entries for the wallet.</returns>
    public async Task<IEnumerable<LedgerEntry>> GetByWalletIdAsync(Guid walletId) =>
        await _db.LedgerEntries
            .Where(l => l.WalletId == walletId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

    /// <summary>Persists all pending changes to the database.</summary>
    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}