/// Dio-based API client for TurfX.
///
/// Configures the Dio instance with:
/// - Base URL from [ApiEndpoints]
/// - Default headers & timeouts
/// - Interceptors for auth, logging, and retry
///
/// Usage is via dependency injection (Riverpod provider).
///
/// Will be fully implemented in Step 2 with Dio dependency.
class ApiClient {
  // TODO: Implement with Dio in Step 2
  //
  // late final Dio _dio;
  //
  // ApiClient() {
  //   _dio = Dio(
  //     BaseOptions(
  //       baseUrl: ApiEndpoints.baseUrl,
  //       connectTimeout: const Duration(seconds: 15),
  //       receiveTimeout: const Duration(seconds: 15),
  //       sendTimeout: const Duration(seconds: 15),
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Accept': 'application/json',
  //       },
  //     ),
  //   );
  //   _dio.interceptors.addAll([
  //     AuthInterceptor(),
  //     LoggingInterceptor(),
  //     RetryInterceptor(),
  //   ]);
  // }
  //
  // Future<Response> get(String path, {Map<String, dynamic>? params});
  // Future<Response> post(String path, {dynamic data});
  // Future<Response> put(String path, {dynamic data});
  // Future<Response> delete(String path);
}
