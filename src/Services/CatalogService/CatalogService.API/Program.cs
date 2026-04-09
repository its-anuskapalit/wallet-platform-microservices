using System.Text;
using CatalogService.Core.Interfaces;
using CatalogService.Core.Services;
using CatalogService.Infrastructure.Clients;
using CatalogService.Infrastructure.Data;
using CatalogService.Infrastructure.Repositories;
using dotenv.net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shared.Common.Middleware;

DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/catalog-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();
builder.Host.UseSerilog();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<CatalogDbContext>(opt =>
    opt.UseSqlServer(connectionString, sql =>
        sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer           = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            ValidateLifetime         = true,
            ClockSkew                = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<ICatalogRepository, CatalogRepository>();
builder.Services.AddScoped<IRedemptionRepository, RedemptionRepository>();
builder.Services.AddScoped<ICatalogService, CatalogDomainService>();
builder.Services.AddScoped<IRedemptionService, RedemptionDomainService>();

// Typed HTTP client to call RewardsService
var rewardsUrl = builder.Configuration["Services:RewardsUrl"] ?? "http://localhost:5005";
builder.Services.AddHttpClient<IRewardsClient, HttpRewardsClient>(c =>
    c.BaseAddress = new Uri(rewardsUrl));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WalletPlatform - Catalog API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Enter your JWT token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Migrate and seed catalog items
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    await db.Database.MigrateAsync();

    if (db.CatalogItems.Count() < 10)
    {
        // Remove child rows first to satisfy FK constraint, then parent rows
        db.Redemptions.RemoveRange(db.Redemptions);
        db.CatalogItems.RemoveRange(db.CatalogItems);
        await db.SaveChangesAsync();
        db.CatalogItems.AddRange(
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Amazon Gift Card ₹500",
                Description = "Redeem for an Amazon India gift voucher worth ₹500.",
                PointsRequired = 500, Category = "Voucher", Stock = 50, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Amazon Gift Card ₹1000",
                Description = "Redeem for an Amazon India gift voucher worth ₹1000.",
                PointsRequired = 900, Category = "Voucher", Stock = 30, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "₹200 Wallet Cashback",
                Description = "Get ₹200 credited directly to your wallet balance.",
                PointsRequired = 200, Category = "Cashback", Stock = 100, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "₹500 Wallet Cashback",
                Description = "Get ₹500 credited directly to your wallet balance.",
                PointsRequired = 450, Category = "Cashback", Stock = 50, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Swiggy Voucher ₹300",
                Description = "Order food worth ₹300 on Swiggy — free on us!",
                PointsRequired = 300, Category = "Food", Stock = 40, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Zomato Pro Voucher",
                Description = "1-month Zomato Pro membership with free deliveries.",
                PointsRequired = 250, Category = "Food", Stock = 60, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "MakeMyTrip ₹1000 Off",
                Description = "Flat ₹1000 discount on any flight or hotel booking.",
                PointsRequired = 1000, Category = "Travel", Stock = 20, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Bus Pass (City 30-day)",
                Description = "30-day unlimited city bus pass for any metro city.",
                PointsRequired = 150, Category = "Travel", Stock = 80, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Myntra ₹500 Voucher",
                Description = "Shop fashion & lifestyle on Myntra worth ₹500.",
                PointsRequired = 480, Category = "Shopping", Stock = 35, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Flipkart SuperCoins Boost",
                Description = "200 SuperCoins credited to your Flipkart account.",
                PointsRequired = 120, Category = "Shopping", Stock = 100, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Netflix 1-Month",
                Description = "Enjoy 1 month of Netflix Standard plan on us.",
                PointsRequired = 600, Category = "Entertainment", Stock = 25, IsActive = true
            },
            new CatalogService.Core.Entities.CatalogItem
            {
                Id = Guid.NewGuid(), Name = "Spotify Premium 3 Months",
                Description = "3 months of ad-free music streaming on Spotify.",
                PointsRequired = 350, Category = "Entertainment", Stock = 45, IsActive = true
            }
        );
        await db.SaveChangesAsync();
    }
}

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Catalog API v1"));
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();