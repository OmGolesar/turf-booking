import '../../../core/errors/failures.dart';

/// Base use case interface.
///
/// Every use case in the application implements this contract.
/// [T] is the return type, [Params] is the input parameter type.
///
/// Use [NoParams] when the use case takes no parameters.
abstract class UseCase<T, Params> {
  Future<({T? data, Failure? failure})> call(Params params);
}

/// Placeholder for use cases that take no parameters.
class NoParams {
  const NoParams();
}
