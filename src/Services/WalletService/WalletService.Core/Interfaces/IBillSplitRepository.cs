using WalletService.Core.Entities;
namespace WalletService.Core.Interfaces;

public interface IBillSplitRepository
{
    Task<BillSplit>        AddAsync(BillSplit split);
    Task<BillSplit?>       GetByIdAsync(Guid id);
    Task<List<BillSplit>>  GetByCreatorAsync(Guid creatorUserId);
    Task<List<BillSplit>>  GetByParticipantEmailAsync(string email);
    Task                   SaveChangesAsync();
}
