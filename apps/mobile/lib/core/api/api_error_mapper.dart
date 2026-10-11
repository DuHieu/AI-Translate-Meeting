import 'package:dio/dio.dart';

import 'api_client.dart';

/// Maps Dio / RFC 7807 failures into user-facing [ApiException]s.
class ApiErrorMapper {
  static ApiException from(Object error) {
    if (error is ApiException) return error;

    if (error is DioException) {
      final nested = error.error;
      if (nested is ApiException) return nested;

      final statusCode = error.response?.statusCode ?? 0;
      final detail = _extractDetail(error.response?.data);
      return ApiException(
        message: detail ?? error.message ?? 'Unexpected network error',
        statusCode: statusCode,
        type: _typeForStatus(statusCode, error.type),
      );
    }

    return ApiException(
      message: error.toString(),
      statusCode: 0,
      type: ApiExceptionType.unknown,
    );
  }

  static String? _extractDetail(dynamic data) {
    if (data is Map) {
      final detail = data['detail'] ?? data['title'] ?? data['message'];
      if (detail is String && detail.isNotEmpty) return detail;
    }
    return null;
  }

  static ApiExceptionType _typeForStatus(
    int statusCode,
    DioExceptionType dioType,
  ) {
    if (dioType == DioExceptionType.connectionTimeout ||
        dioType == DioExceptionType.sendTimeout ||
        dioType == DioExceptionType.receiveTimeout) {
      return ApiExceptionType.timeout;
    }
    if (dioType == DioExceptionType.connectionError) {
      return ApiExceptionType.network;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return ApiExceptionType.client;
    }
    if (statusCode >= 500) {
      return ApiExceptionType.server;
    }
    return ApiExceptionType.unknown;
  }

  // Prevent instantiation
  ApiErrorMapper._();
}
