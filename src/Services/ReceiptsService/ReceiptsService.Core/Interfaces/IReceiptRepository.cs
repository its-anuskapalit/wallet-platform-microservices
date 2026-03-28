using ReceiptsService.Core.Entities;

namespace ReceiptsService.Core.Interfaces;

public interface IReceiptRepository
{
    Task<Receipt?> GetByTransactionIdAsync(Guid transactionId);
    Task<IEnumerable<Receipt>> GetByUserIdAsync(Guid userId);
    Task<bool> ExistsByTransactionIdAsync(Guid transactionId);
    Task AddAsync(Receipt receipt);
    Task SaveChangesAsync();
}