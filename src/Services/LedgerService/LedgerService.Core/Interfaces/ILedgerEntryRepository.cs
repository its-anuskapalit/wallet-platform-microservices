// ILedgerEntryRepository.cs
using LedgerService.Core.Entities;

namespace LedgerService.Core.Interfaces;

public interface ILedgerEntryRepository
{
    Task AddRangeAsync(IEnumerable<LedgerEntry> entries);
    Task<IEnumerable<LedgerEntry>> GetByWalletIdAsync(Guid walletId);
    Task SaveChangesAsync();
}