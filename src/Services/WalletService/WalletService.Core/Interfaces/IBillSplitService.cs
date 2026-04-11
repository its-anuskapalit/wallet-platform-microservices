using Shared.Common;
using WalletService.Core.DTOs;
namespace WalletService.Core.Interfaces;

public interface IBillSplitService
{
    Task<Result<BillSplitDto>>       CreateAsync(Guid creatorUserId, string creatorEmail, CreateBillSplitDto dto);
    Task<Result<List<BillSplitDto>>> GetMyCreatedAsync(Guid userId);
    Task<Result<List<BillSplitDto>>> GetMyOwedAsync(string email);
    Task<Result<BillSplitDto>>       PayShareAsync(Guid splitId, Guid payerUserId, string payerEmail, string authorizationHeader);
}
