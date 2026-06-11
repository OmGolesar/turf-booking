import 'package:flutter/foundation.dart';

/// Simple logger for TurfX.
///
/// Wraps [debugPrint] to ensure logs are only output in debug mode.
/// Will be enhanced with a logging package in Step 2 if needed.
class AppLogger {
  AppLogger._();

  static void debug(String message, {String? tag}) {
    if (kDebugMode) {
      debugPrint('🔍 [${tag ?? 'DEBUG'}] $message');
    }
  }

  static void info(String message, {String? tag}) {
    if (kDebugMode) {
      debugPrint('ℹ️ [${tag ?? 'INFO'}] $message');
    }
  }

  static void warning(String message, {String? tag}) {
    if (kDebugMode) {
      debugPrint('⚠️ [${tag ?? 'WARN'}] $message');
    }
  }

  static void error(String message, {String? tag, Object? error, StackTrace? stackTrace}) {
    if (kDebugMode) {
      debugPrint('❌ [${tag ?? 'ERROR'}] $message');
      if (error != null) debugPrint('  Error: $error');
      if (stackTrace != null) debugPrint('  Stack: $stackTrace');
    }
  }

  static void network(String method, String url, {int? statusCode, String? body}) {
    if (kDebugMode) {
      debugPrint('🌐 [$method] $url ${statusCode != null ? '→ $statusCode' : ''}');
      if (body != null && body.length < 500) debugPrint('  Body: $body');
    }
  }
}
