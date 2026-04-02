using ReceiptsService.Core.Entities;

namespace ReceiptsService.Core.Interfaces;

/// <summary>
/// Defines data-access operations for <see cref="Receipt"/> entities.
/// </summary>
public interface IReceiptRepository
{
    /// <summary>Retrieves the receipt associated with the specified transaction, or <c>null</c> if not found.</summary>
    Task<Receipt?> GetByTransactionIdAsync(Guid transactionId);

    /// <summary>Retrieves all receipts where the specified user is sender or receiver, ordered by transaction date descending.</summary>
    Task<IEnumerable<Receipt>> GetByUserIdAsync(Guid userId);

    /// <summary>Returns <c>true</c> if a receipt already exists for the given transaction.</summary>
    Task<bool> ExistsByTransactionIdAsync(Guid transactionId);

    /// <summary>Stages a new receipt for insertion.</summary>
    Task AddAsync(Receipt receipt);

    /// <summary>Persists all pending changes to the database.</summary>
    Task SaveChangesAsync();
}