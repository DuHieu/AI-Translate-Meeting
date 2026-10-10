import 'package:dio/dio.dart';
import '../constants/app_config.dart';
import '../utils/logger.dart';
import '../utils/secure_storage.dart';

/// HTTP client for API communication
class ApiClient {
  final Dio _dio;
  final SecureStorage _secureStorage;

  ApiClient({
    required String baseUrl,
    required SecureStorage secureStorage,
  })  : _secureStorage = secureStorage,
        _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: AppConfig.httpConnectTimeout,
            receiveTimeout: AppConfig.httpReceiveTimeout,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          ),
        ) {
    _setupInterceptors();
  }

  void _setupInterceptors() {
    // Logging interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          AppLogger.d(
            'API Request: ${options.method} ${options.path}',
          );
          handler.next(options);
        },
        onResponse: (response, handler) {
          AppLogger.d(
            'API Response: ${response.statusCode} ${response.requestOptions.path}',
          );
          handler.next(response);
        },
        onError: (error, handler) {
          AppLogger.e(
            'API Error: ${error.response?.statusCode} ${error.requestOptions.path}',
            error,
          );
          handler.next(error);
        },
      ),
    );

    // Authentication interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Add session token if available
          final token = await _secureStorage.getSessionToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );

    // Error handling interceptor
    _dio.interceptors.add(
      InterceptorsWrapper(
        onError: (error, handler) {
          final apiException = _handleError(error);
          handler.reject(
            DioException(
              requestOptions: error.requestOptions,
              error: apiException,
              response: error.response,
              type: error.type,
            ),
          );
        },
      ),
    );
  }

  ApiException _handleError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          message: 'Connection timeout. Please check your network.',
          statusCode: 0,
          type: ApiExceptionType.timeout,
        );

      case DioExceptionType.badResponse:
        final statusCode = error.response?.statusCode ?? 0;
        final message = _getErrorMessage(statusCode, error.response?.data);
        return ApiException(
          message: message,
          statusCode: statusCode,
          type: _getExceptionType(statusCode),
        );

      case DioExceptionType.cancel:
        return ApiException(
          message: 'Request cancelled',
          statusCode: 0,
          type: ApiExceptionType.cancelled,
        );

      case DioExceptionType.connectionError:
        return ApiException(
          message: 'Network error. Please check your connection.',
          statusCode: 0,
          type: ApiExceptionType.network,
        );

      default:
        return ApiException(
          message: 'An unexpected error occurred. Please try again.',
          statusCode: 0,
          type: ApiExceptionType.unknown,
        );
    }
  }

  String _getErrorMessage(int statusCode, dynamic responseData) {
    // Try to extract error message from response
    if (responseData is Map) {
      if (responseData.containsKey('title')) {
        return responseData['title'] as String;
      }
      if (responseData.containsKey('detail')) {
        return responseData['detail'] as String;
      }
      if (responseData.containsKey('message')) {
        return responseData['message'] as String;
      }
    }

    // Default messages based on status code
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please sign in again.';
      case 403:
        return 'Access denied. You do not have permission.';
      case 404:
        return 'Meeting not found.';
      case 409:
        return 'Meeting is full or has ended.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred (Code: $statusCode)';
    }
  }

  ApiExceptionType _getExceptionType(int statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
      return ApiExceptionType.client;
    } else if (statusCode >= 500) {
      return ApiExceptionType.server;
    }
    return ApiExceptionType.unknown;
  }

  /// GET request
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.get(
      path,
      queryParameters: queryParameters,
      options: options,
    );
  }

  /// POST request
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.post(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  /// PUT request
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.put(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  /// DELETE request
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.delete(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  /// PATCH request
  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.patch(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }
}

/// Custom API exception
class ApiException implements Exception {
  final String message;
  final int statusCode;
  final ApiExceptionType type;

  ApiException({
    required this.message,
    required this.statusCode,
    required this.type,
  });

  @override
  String toString() => message;
}

/// API exception types
enum ApiExceptionType {
  network,
  timeout,
  cancelled,
  client,
  server,
  unknown,
}
