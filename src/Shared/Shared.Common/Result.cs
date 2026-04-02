namespace Shared.Common;

/// <summary>
/// Represents the outcome of an operation that produces a value of type <typeparamref name="T"/>.
/// Encapsulates either a successful result with data or a failure with an error message.
/// </summary>
/// <typeparam name="T">The type of the value returned on success.</typeparam>
public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Data { get; private set; }
    public string? Error { get; private set; }
    private Result() { }

    /// <summary>Creates a successful result containing the specified data.</summary>
    /// <param name="data">The value produced by the operation.</param>
    /// <returns>A <see cref="Result{T}"/> with <see cref="IsSuccess"/> set to <c>true</c>.</returns>
    public static Result<T> Success(T data) => new() { IsSuccess = true, Data = data };

    /// <summary>Creates a failed result containing the specified error message.</summary>
    /// <param name="error">A human-readable description of the failure.</param>
    /// <returns>A <see cref="Result{T}"/> with <see cref="IsSuccess"/> set to <c>false</c>.</returns>
    public static Result<T> Failure(string error) => new() { IsSuccess = false, Error = error };
}

/// <summary>
/// Represents the outcome of an operation that produces no value.
/// Encapsulates either a successful completion or a failure with an error message.
/// </summary>
public class Result
{
    public bool IsSuccess { get; private set; }
    public string? Error { get; private set; }
    private Result() { }

    /// <summary>Creates a successful result indicating the operation completed without errors.</summary>
    /// <returns>A <see cref="Result"/> with <see cref="IsSuccess"/> set to <c>true</c>.</returns>
    public static Result Success() => new() { IsSuccess = true };

    /// <summary>Creates a failed result containing the specified error message.</summary>
    /// <param name="error">A human-readable description of the failure.</param>
    /// <returns>A <see cref="Result"/> with <see cref="IsSuccess"/> set to <c>false</c>.</returns>
    public static Result Failure(string error) => new() { IsSuccess = false, Error = error };
}