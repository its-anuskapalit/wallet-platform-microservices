using AdminService.Core.DTOs;
using AdminService.Core.Entities;
using AdminService.Core.Interfaces;
using Shared.Common;

namespace AdminService.Core.Services;

public class AdminDomainService : IAdminService
{
    private readonly IAdminRepository _adminRepo;

    public AdminDomainService(IAdminRepository adminRepo)
    {
        _adminRepo = adminRepo;
    }

    public async Task<Result<DashboardDto>> GetDashboardAsync()
    {
        var fraudFlags         = await _adminRepo.GetFraudFlagCountAsync();
        var unresolvedFlags    = await _adminRepo.GetUnresolvedFraudFlagCountAsync();

        return Result<DashboardDto>.Success(new DashboardDto
        {
            FraudFlags            = fraudFlags,
            UnresolvedFraudFlags  = unresolvedFlags
        });
    }

    public async Task<Result<FraudFlagResponseDto>> FlagTransactionAsync(
        Guid transactionId, FraudFlagDto dto, Guid flaggedBy)
    {
        var existing = await _adminRepo.GetFraudFlagByTransactionIdAsync(transactionId);
        if (existing is not null)
            return Result<FraudFlagResponseDto>.Failure("Transaction already flagged.");

        var flag = new FraudFlag
        {
            TransactionId    = transactionId,
            FlaggedByUserId  = flaggedBy,
            Reason           = dto.Reason
        };

        await _adminRepo.AddFraudFlagAsync(flag);
        await _adminRepo.SaveChangesAsync();

        return Result<FraudFlagResponseDto>.Success(MapToDto(flag));
    }

    public async Task<Result<IEnumerable<FraudFlagResponseDto>>> GetFraudFlagsAsync()
    {
        var flags = await _adminRepo.GetAllFraudFlagsAsync();
        return Result<IEnumerable<FraudFlagResponseDto>>.Success(flags.Select(MapToDto));
    }

    private static FraudFlagResponseDto MapToDto(FraudFlag f) => new()
    {
        Id            = f.Id,
        TransactionId = f.TransactionId,
        Reason        = f.Reason,
        IsResolved    = f.IsResolved,
        CreatedAt     = f.CreatedAt
    };
}