import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/utils/logger.dart';

void main() {
  // Setup error handling
  FlutterError.onError = (details) {
    AppLogger.e(
      'Flutter error',
      details.exception,
      details.stack,
    );
  };

  // Run app with Riverpod
  runApp(
    const ProviderScope(
      child: LayaMeetApp(),
    ),
  );

  AppLogger.i('Laya Meet app started');
}
