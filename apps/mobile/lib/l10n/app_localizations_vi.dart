import 'app_localizations.dart';

class AppLocalizationsVi extends AppLocalizations {
  AppLocalizationsVi() : super('vi');

  @override
  String get appName => 'Laya Meet';
  @override
  String get homeTitle => 'Họp không rào cản ngôn ngữ';
  @override
  String get homeSubtitle => 'Tạo phòng mới hoặc tham gia bằng mã 6 ký tự';
  @override
  String get createNewMeeting => 'Tạo cuộc họp mới';
  @override
  String get joinByCode => 'Tham gia bằng mã';
  @override
  String get joinMeeting => 'Tham Gia Cuộc Họp';
  @override
  String get meetingCode => 'Mã Cuộc Họp';
  @override
  String get enterMeetingCode => 'Nhập mã 6 ký tự';
  @override
  String get clearMeetingCode => 'Xóa mã cuộc họp';
  @override
  String get recentMeetings => 'Lịch sử cuộc họp gần đây';
  @override
  String get noRecentMeetings => 'Chưa có cuộc họp gần đây';
  @override
  String get rejoin => 'Vào lại';
  @override
  String get displayName => 'Tên Hiển Thị';
  @override
  String get displayNameHint => 'Tên người khác sẽ thấy';
  @override
  String get spokenLanguage => 'Ngôn Ngữ Nói';
  @override
  String get targetLanguage => 'Ngôn Ngữ Dịch';
  @override
  String get vietnamese => 'Tiếng Việt';
  @override
  String get japanese => 'Tiếng Nhật';
  @override
  String get english => 'Tiếng Anh';
  @override
  String get cameraOn => 'Bật camera';
  @override
  String get cameraOff => 'Tắt camera';
  @override
  String get micOn => 'Bật micro';
  @override
  String get micOff => 'Tắt micro';
  @override
  String get cameraPreview => 'Xem trước camera';
  @override
  String get cameraUnavailable => 'Không thể xem trước camera';
  @override
  String get micLevel => 'Mức micro';
  @override
  String get prejoinTitle => 'Chuẩn bị tham gia';
  @override
  String get prejoinSubtitle => 'Kiểm tra camera, micro và ngôn ngữ';
  @override
  String get joinNow => 'Tham gia ngay';
  @override
  String get leaveMeeting => 'Rời Cuộc Họp';
  @override
  String get invalidMeetingCode => 'Mã cuộc họp không hợp lệ';
  @override
  String get meetingNotFound => 'Phòng không tồn tại';
  @override
  String get meetingEnded => 'Phòng đã kết thúc hoặc bị khóa';
  @override
  String get createMeetingUnauthorized =>
      'Cần xác thực host để tạo cuộc họp';
  @override
  String get networkError => 'Lỗi mạng. Vui lòng kiểm tra kết nối.';
  @override
  String get unexpectedError => 'Đã xảy ra lỗi. Vui lòng thử lại.';
  @override
  String get displayNameRequired => 'Vui lòng nhập tên hiển thị';
  @override
  String get loading => 'Đang tải...';
  @override
  String get creatingMeeting => 'Đang tạo cuộc họp...';
  @override
  String get joiningMeeting => 'Đang tham gia...';
  @override
  String get permissionRequiredTitle => 'Cần cấp quyền';
  @override
  String get permissionRequiredBody =>
      'Quyền camera hoặc micro đã bị từ chối vĩnh viễn. Mở cài đặt để bật lại.';
  @override
  String get openSettings => 'Mở cài đặt';
  @override
  String get cancel => 'Hủy';
  @override
  String get meetingRoomPlaceholder =>
      'Phòng họp đang chuẩn bị cho Task 5';
  @override
  String get meetingRoomPlaceholderBody =>
      'Token đã sẵn sàng. Lưới video LiveKit sẽ có ở bước tiếp theo.';
  @override
  String get backToHome => 'Về trang chủ';
  @override
  String get participantIdLabel => 'Người tham gia';
  @override
  String get meetingCodeLabel => 'Mã';
  @override
  String get waitingForParticipants => 'Đang chờ người tham gia…';
  @override
  String get reconnecting => 'Đang kết nối lại cuộc họp…';
  @override
  String get livekitConnectFailed => 'Không thể kết nối phòng họp';
  @override
  String get cameraToggleFailed => 'Không thể bật/tắt camera';
  @override
  String get micToggleFailed => 'Không thể bật/tắt micro';
  @override
  String get youLabel => 'bạn';
  @override
  String get subtitleReconnecting => 'Đang kết nối lại phụ đề…';
  @override
  String get subtitleUnavailable => 'Phụ đề không khả dụng';
  @override
  String get subtitlePartial => 'Đang nghe…';
  @override
  String get subtitleConnectFailed => 'Không thể kết nối luồng phụ đề';
  @override
  String get tagDecision => 'Quyết định';
  @override
  String get tagActionItem => 'Hành động';
  @override
  String get flipCamera => 'Đổi camera';
  @override
  String get speakerOn => 'Loa ngoài';
  @override
  String get speakerOff => 'Tắt loa ngoài';
  @override
  String get leaveMeetingConfirmTitle => 'Rời cuộc họp?';
  @override
  String get leaveMeetingConfirmBody =>
      'Bạn sẽ ngắt kết nối video, audio và phụ đề.';
  @override
  String get errorTitle => 'Đã xảy ra lỗi';
  @override
  String get retry => 'Thử lại';
  @override
  String get networkExcellent => 'Tốt';
  @override
  String get networkGood => 'Ổn';
  @override
  String get networkPoor => 'Yếu';
  @override
  String get networkUnknown => 'Mạng';
  @override
  String get cameraFlipFailed => 'Không thể đổi camera';
  @override
  String get speakerToggleFailed => 'Không thể đổi loa';
  @override
  String get networkReconnectFailed => 'Không thể kết nối lại cuộc họp';
  @override
  String get networkReconnecting =>
      'Mạng không ổn định — đang kết nối lại…';
  @override
  String get networkRestored => 'Đã khôi phục kết nối';
  @override
  String get videoDegraded =>
      'Đã tạm tắt camera để giữ chất lượng cuộc gọi';
  @override
  String get cameraFlipped => 'Đã đổi camera';
}
