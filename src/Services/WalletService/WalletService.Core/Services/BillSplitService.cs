using Shared.Common;
using WalletService.Core.DTOs;
using WalletService.Core.Entities;
using WalletService.Core.Interfaces;
namespace WalletService.Core.Services;
public class BillSplitDomainService : IBillSplitService
{
    private readonly IBillSplitRepository _repo;
    private readonly IWalletRepository _wallets;
    private readonly ILedgerClient _ledger;

    public BillSplitDomainService(IBillSplitRepository repo, IWalletRepository wallets, ILedgerClient ledger)
    {
        _repo = repo;
        _wallets = wallets;
        _ledger = ledger;
    }

    public async Task<Result<BillSplitDto>> CreateAsync(Guid creatorUserId, string creatorEmail, CreateBillSplitDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return Result<BillSplitDto>.Failure("Title is required.");
        }
        if (dto.Participants == null || dto.Participants.Count == 0)
        {
            return Result<BillSplitDto>.Failure("At least one participant is required.");
        }
        var participantTotal = dto.Participants.Sum(p => p.ShareAmount);
        if (Math.Abs(participantTotal - dto.TotalAmount) > 0.01m)
        {
            return Result<BillSplitDto>.Failure($"Participant shares ({participantTotal:F2}) must equal total amount ({dto.TotalAmount:F2}).");
        }
        var split = new BillSplit
        {
            CreatorUserId = creatorUserId,
            CreatorEmail = creatorEmail,
            Title = dto.Title.Trim(),
            TotalAmount = dto.TotalAmount,
            Participants = dto.Participants.Select(p => new BillSplitParticipant
            {
                Email = p.Email.Trim().ToLower(),
                ShareAmount = p.ShareAmount,
                Status = ParticipantStatus.Pending
            }).ToList()
        };

        var saved = await _repo.AddAsync(split);
        return Result<BillSplitDto>.Success(ToDto(saved));
    }
    //Retrieves all bill splits created by the authenticated user
    public async Task<Result<List<BillSplitDto>>> GetMyCreatedAsync(Guid userId)
    {
        var splits = await _repo.GetByCreatorAsync(userId);
        return Result<List<BillSplitDto>>.Success(splits.Select(ToDto).ToList());
    }

    public async Task<Result<List<BillSplitDto>>> GetMyOwedAsync(string email)
    {
        var norm = NormalizeEmail(email);
        if (string.IsNullOrEmpty(norm))
        {
            return Result<List<BillSplitDto>>.Success(new List<BillSplitDto>());
        }
        var splits = await _repo.GetByParticipantEmailAsync(norm);
        return Result<List<BillSplitDto>>.Success(splits.Select(ToDto).ToList());
    }

    public async Task<Result<BillSplitDto>> PayShareAsync(Guid splitId, Guid payerUserId, string payerEmail, string authorizationHeader)
    {
        var split = await _repo.GetByIdAsync(splitId);
        if (split is null)
        {
            return Result<BillSplitDto>.Failure("Bill split not found.");
        }
        var normEmail = NormalizeEmail(payerEmail);
        var participant = split.Participants.FirstOrDefault(p => NormalizeEmail(p.Email) == normEmail);

        if (participant is null)
        {
            return Result<BillSplitDto>.Failure("You are not a participant in this split.");
        }
        if (participant.Status == ParticipantStatus.Paid)
        {
            return Result<BillSplitDto>.Failure("You have already paid your share.");
        }
        if (split.Status == BillSplitStatus.Cancelled)
        {
            return Result<BillSplitDto>.Failure("This bill split has been cancelled.");
        }

        var payerWallet = await _wallets.GetByUserIdAsync(payerUserId)
            ?? (string.IsNullOrEmpty(normEmail) ? null : await _wallets.GetByEmailAsync(normEmail));
        if (payerWallet is null)
        {
            return Result<BillSplitDto>.Failure("Your wallet was not found.");
        }
        if (payerWallet.UserId != payerUserId)
        {
            return Result<BillSplitDto>.Failure("Your wallet was not found.");
        }
        if (payerWallet.Status == WalletService.Core.Enums.WalletStatus.Frozen)
        {
            return Result<BillSplitDto>.Failure("Your wallet is frozen.");
        }
        if (payerWallet.Balance < participant.ShareAmount)
        {
            return Result<BillSplitDto>.Failure($"Insufficient balance. You need {participant.ShareAmount:F2} but have {payerWallet.Balance:F2}.");
        }

        var creatorWallet = await _wallets.GetByUserIdAsync(split.CreatorUserId)
            ?? await _wallets.GetByEmailAsync(split.CreatorEmail);
        if (creatorWallet is null)
        {
            return Result<BillSplitDto>.Failure("Creator wallet not found.");
        }
        if (creatorWallet.UserId != split.CreatorUserId)
            return Result<BillSplitDto>.Failure("Creator wallet not found.");

        var payerDisplay = string.IsNullOrWhiteSpace(payerWallet.FullName) ? normEmail : $"{payerWallet.FullName.Trim()} ({normEmail})";
        var hostDisplay = string.IsNullOrWhiteSpace(creatorWallet.FullName)
            ? split.CreatorEmail.Trim()
            : $"{creatorWallet.FullName.Trim()} ({split.CreatorEmail.Trim()})";
        var memo = $"Bill split: {split.Title}\nFrom (payer): {payerDisplay}\nTo (host): {hostDisplay}\nReference: bill split share payment";
        if (memo.Length > 1500) memo = memo[..1500];

        var idempotencyKey = $"billsplit:{splitId:N}:{payerUserId:N}";
        var ledgerDto = new LedgerInitiateTransferDto
        {
            SenderWalletId = payerWallet.Id,
            ReceiverWalletId = creatorWallet.Id,
            ReceiverUserId = creatorWallet.UserId,
            Amount = participant.ShareAmount,
            Currency = payerWallet.Currency ?? "INR",
            Type = "Transfer",
            IdempotencyKey = idempotencyKey,
            Memo = memo
        };

        var ledgerResult = await _ledger.InitiateTransferAsync(ledgerDto, authorizationHeader);
        if (!ledgerResult.IsSuccess)
        {
            return Result<BillSplitDto>.Failure(ledgerResult.Error ?? "Could not record payment.");
        }
        participant.Status = ParticipantStatus.Paid;
        participant.PaidAt = DateTime.UtcNow;

        var allPaid = split.Participants.All(p => p.Status == ParticipantStatus.Paid);
        var anyPaid  = split.Participants.Any(p => p.Status == ParticipantStatus.Paid);
        split.Status = allPaid ? BillSplitStatus.Completed
                     : anyPaid ? BillSplitStatus.PartiallyPaid
                     : BillSplitStatus.Open;

        await _repo.SaveChangesAsync();
        return Result<BillSplitDto>.Success(ToDto(split));
    }

    private static string NormalizeEmail(string? email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static BillSplitDto ToDto(BillSplit s) => new(
        s.Id, s.Title, s.TotalAmount, s.Status.ToString(), s.CreatorEmail, s.CreatedAt,
        s.Participants.Select(p => new ParticipantDto(
            p.Id, p.Email, p.FullName, p.ShareAmount, p.Status.ToString(), p.PaidAt
        )).ToList()
    );
}
