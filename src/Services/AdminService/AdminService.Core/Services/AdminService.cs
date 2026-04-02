using AdminService.Core.DTOs;
using AdminService.Core.Entities;
using AdminService.Core.Interfaces;
using Shared.Common;

namespace AdminService.Core.Services;

/// <summary>
/// Implements admin domain operations including dashboard statistics retrieval
/// and fraud-flag management for suspicious transactions.
/// </summary>
public class AdminDomainService : IAdminService
{
    private readonly IAdminRepository _adminRepo;

    /// <summary>
    /// Initializes a new instance of <see cref="AdminDomainService"/>.
    /// </summary>
    /// <param name="adminRepo">Repository for admin data access operations.</param>
    public AdminDomainService(IAdminRepository adminRepo)
    {
        _adminRepo = adminRepo;
    }

    /// <summary>Retrieves a summary of fraud-flag statistics for the admin dashboard.</summary>
    /// <returns>A successful result containing total and unresolved fraud flag counts.</returns>
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

    /// <summary>Creates a fraud flag for the specified transaction if one does not already exist.</summary>
    /// <param name="transactionId">The unique identifier of the suspicious transaction.</param>
    /// <param name="dto">Fraud flag details including the reason.</param>
    /// <param name="flaggedBy">The unique identifier of the admin user raising the flag.</param>
    /// <returns>A successful result with the created flag; or a failure if the transaction is already flagged.</returns>
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

    /// <summary>Retrieves all fraud flags ordered by creation date descending.</summary>
    /// <returns>A successful result containing all fraud flag records.</returns>
    public async Task<Result<IEnumerable<FraudFlagResponseDto>>> GetFraudFlagsAsync()
    {
        var flags = await _adminRepo.GetAllFraudFlagsAsync();
        return Result<IEnumerable<FraudFlagResponseDto>>.Success(flags.Select(MapToDto));
    }

    /// <summary>Maps a <see cref="FraudFlag"/> entity to a <see cref="FraudFlagResponseDto"/> for API responses.</summary>
    private static FraudFlagResponseDto MapToDto(FraudFlag f) => new()
    {
        Id            = f.Id,
        TransactionId = f.TransactionId,
        Reason        = f.Reason,
        IsResolved    = f.IsResolved,
        CreatedAt     = f.CreatedAt
    };
}