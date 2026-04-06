using Shared.Common;
namespace WalletService.Core.Entities;
public class IdempotencyKey : BaseEntity
{
    public string Key { get; set; } = string.Empty; //UNIQUE index in DB
    public string Response { get; set; } = string.Empty; // JSON-serialised WalletDto
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(1);
}