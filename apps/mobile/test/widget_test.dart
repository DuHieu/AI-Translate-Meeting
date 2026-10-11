import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/secure_storage.dart';

import 'helpers/fakes.dart';

void main() {
  testWidgets('LayaMeetApp boots to HomeScreen', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          meetingApiProvider.overrideWithValue(FakeMeetingApi()),
          secureStorageProvider.overrideWithValue(SecureStorage.memory()),
        ],
        child: const LayaMeetApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Laya Meet'), findsWidgets);
  });
}
