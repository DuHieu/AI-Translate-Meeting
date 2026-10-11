import 'package:permission_handler/permission_handler.dart';

/// Thin wrapper around [permission_handler] for testability.
class PermissionService {
  Future<PermissionStatus> status(Permission permission) => permission.status;

  Future<PermissionStatus> request(Permission permission) =>
      permission.request();

  Future<bool> openSettings() => openAppSettings();
}

class FakePermissionService extends PermissionService {
  FakePermissionService({
    this.cameraStatus = PermissionStatus.granted,
    this.micStatus = PermissionStatus.granted,
    this.openSettingsResult = true,
  });

  PermissionStatus cameraStatus;
  PermissionStatus micStatus;
  bool openSettingsResult;
  int requestCount = 0;

  @override
  Future<PermissionStatus> status(Permission permission) async {
    if (permission == Permission.camera) return cameraStatus;
    if (permission == Permission.microphone) return micStatus;
    return PermissionStatus.denied;
  }

  @override
  Future<PermissionStatus> request(Permission permission) async {
    requestCount += 1;
    return status(permission);
  }

  @override
  Future<bool> openSettings() async => openSettingsResult;
}
