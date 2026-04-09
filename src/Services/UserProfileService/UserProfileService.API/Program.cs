using System.Text;
using dotenv.net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Shared.Common.Middleware;
using Shared.EventBus;
using Shared.EventBus.Options;
using UserProfileService.Core.Interfaces;
using UserProfileService.Core.Services;
using UserProfileService.Infrastructure.Consumers;
using UserProfileService.Infrastructure.Data;
using UserProfileService.Infrastructure.Repositories;

// ── Load .env ─────────────────────────────────────────────────────
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// Load env into config
builder.Configuration.AddEnvironmentVariables();

// ── Serilog ───────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .WriteTo.File("logs/userprofile-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();

builder.Host.UseSerilog();

// ── Database ──────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<UserProfileDbContext>(opt =>
    opt.UseSqlServer(connectionString, sql =>
        sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null)));

// ── JWT ───────────────────────────────────────────────────────────
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

// ── Repositories ──────────────────────────────────────────────────
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<IKycRepository, KycRepository>();

// ── Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IKycService, KycService>();

// ── RabbitMQ ──────────────────────────────────────────────────────
builder.Services.Configure<RabbitMqOptions>(o =>
{
    o.Host     = builder.Configuration["RabbitMq:Host"]!;
    o.Port     = int.Parse(builder.Configuration["RabbitMq:Port"] ?? "5672");
    o.Username = builder.Configuration["RabbitMq:Username"]!;
    o.Password = builder.Configuration["RabbitMq:Password"]!;
});
builder.Services.AddEventBus();

// Background consumer
builder.Services.AddHostedService<UserRegisteredConsumer>();

// ── Controllers & Swagger ─────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WalletPlatform - UserProfile API",
        Version = "v1"
    });

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

// ── Auto migrate ──────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<UserProfileDbContext>();
    await db.Database.MigrateAsync();
}

// ── Pipeline ──────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "UserProfile API v1"));
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();