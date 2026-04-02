namespace Shared.Common;

/// <summary>
/// Provides common audit and identity properties for all domain entities.
/// Serves as the base class for every persisted entity in the platform.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = "system";
    public string? UpdatedBy { get; set; }
}