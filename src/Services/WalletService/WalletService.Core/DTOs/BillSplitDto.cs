namespace WalletService.Core.DTOs;

public record CreateBillSplitDto(
    string Title,
    decimal TotalAmount,
    List<ParticipantInputDto> Participants
);

public record ParticipantInputDto(string Email, decimal ShareAmount);

public record BillSplitDto(
    Guid Id,
    string Title,
    decimal TotalAmount,
    string Status,
    string CreatorEmail,
    DateTime CreatedAt,
    List<ParticipantDto> Participants
);

public record ParticipantDto(
    Guid Id,
    string Email,
    string FullName,
    decimal ShareAmount,
    string Status,
    DateTime? PaidAt
);
