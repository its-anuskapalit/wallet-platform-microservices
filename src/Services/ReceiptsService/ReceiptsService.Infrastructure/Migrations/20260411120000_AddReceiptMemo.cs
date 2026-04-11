using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ReceiptsService.Infrastructure.Migrations
{
/// <inheritdoc />
public partial class AddReceiptMemo : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Memo",
            table: "Receipts",
            type: "nvarchar(1500)",
            maxLength: 1500,
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Memo",
            table: "Receipts");
    }
}
}