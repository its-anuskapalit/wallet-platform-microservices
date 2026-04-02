// ILedgerEntryRepository.cs
using LedgerService.Core.Entities;

namespace LedgerService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="LedgerEntry"/> entities (double-entry accounting records).
/// </summary>
public interface ILedgerEntryRepository
{
    /// <summary>Stages a batch of ledger entries for insertion.</summary>
    Task AddRangeAsync(IEnumerable<LedgerEntry> entries);

    /// <summary>Retrieves all ledger entries for the specified wallet, ordered by creation date descending.</summary>
    Task<IEnumerable<LedgerEntry>> GetByWalletIdAsync(Guid walletId);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}