import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/providers/app_providers.dart';
import 'package:mobile/core/utils/permission_service.dart';
import 'package:mobile/core/utils/secure_storage.dart';
import 'package:mobile/features/prejoin/providers/prejoin_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../helpers/fakes.dart';

void main() {
  late FakeMeetingApi api;
  late SecureStorage storage;
  late FakePermissionService permissions;
  late ProviderContainer container;

  setUp(() async {
    api = FakeMeetingApi();
    storage = SecureStorage.memory();
    permissions = FakePermissionService();
    await storage.saveDisplayName('Ada');
    await storage.saveSpokenLanguage('vi');
    await storage.saveTargetLanguage('en');

    container = ProviderContainer(
      overrides: [
        meetingApiProvider.overrideWithValue(api),
        secureStorageProvider.overrideWithValue(storage),
        permissionServiceProvider.overrideWithValue(permissions),
      ],
    );

    // Allow bootstrap microtask to finish.
    await container.read(prejoinProvider.notifier).restorePreferences();
    await container.read(prejoinProvider.notifier).refreshPermissions();
  });

  tearDown(() => container.dispose());

  test('restores preferences from secure storage', () {
    final state = container.read(prejoinProvider);
    expect(state.displayName, 'Ada');
    expect(state.spokenLanguage, 'vi');
    expect(state.targetLanguage, 'en');
  });

  test('joinMeeting requires display name', () async {
    container.read(prejoinProvider.notifier).setDisplayName('   ');
    final result =
        await container.read(prejoinProvider.notifier).joinMeeting('ABC123');
    expect(result, isNull);
    expect(
      container.read(prejoinProvider).errorMessage,
      'display_name_required',
    );
  });

  test('joinMeeting saves tokens and preferences', () async {
    container.read(prejoinProvider.notifier).setDisplayName('Ada Lovelace');
    final response =
        await container.read(prejoinProvider.notifier).joinMeeting('abc123');

    expect(response?.participantId, 'p1');
    expect(api.lastJoinedCode, 'ABC123');
    expect(api.lastJoinRequest?.displayName, 'Ada Lovelace');
    expect(await storage.getLivekitToken(), 'lk');
    expect(await storage.getDisplayName(), 'Ada Lovelace');
  });

  test('joinMeeting maps 403 to meeting_ended', () async {
    api.joinError = ApiException(
      message: 'locked',
      statusCode: 403,
      type: ApiExceptionType.client,
    );
    container.read(prejoinProvider.notifier).setDisplayName('Ada');

    final result =
        await container.read(prejoinProvider.notifier).joinMeeting('ABC123');

    expect(result, isNull);
    expect(container.read(prejoinProvider).errorMessage, 'meeting_ended');
  });

  test('permanently denied camera sets permission prompt', () async {
    permissions.cameraStatus = PermissionStatus.permanentlyDenied;
    final granted =
        await container.read(prejoinProvider.notifier).ensureCameraPermission();
    expect(granted, isFalse);
    expect(
      container.read(prejoinProvider).permissionPrompt,
      PermissionPrompt.camera,
    );
  });
}
