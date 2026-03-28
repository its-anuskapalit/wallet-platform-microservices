// ITransactionRepository.cs
using LedgerService.Core.Entities;

namespace LedgerService.Core.Interfaces;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id);
    Task<Transaction?> GetByIdempotencyKeyAsync(string key);
    Task<IEnumerable<Transaction>> GetBySenderUserIdAsync(Guid userId);
    Task AddAsync(Transaction transaction);
    Task SaveChangesAsync();
}