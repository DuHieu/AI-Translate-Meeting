import 'app_localizations.dart';

class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa() : super('ja');

  @override
  String get appName => 'Laya Meet';
  @override
  String get homeTitle => '言語の壁を越えるミーティング';
  @override
  String get homeSubtitle => '新規作成、または6文字コードで参加';
  @override
  String get createNewMeeting => '新しいミーティングを作成';
  @override
  String get joinByCode => 'コードで参加';
  @override
  String get joinMeeting => 'ミーティングに参加';
  @override
  String get meetingCode => 'ミーティングコード';
  @override
  String get enterMeetingCode => '6文字のコードを入力';
  @override
  String get clearMeetingCode => 'コードをクリア';
  @override
  String get recentMeetings => '最近のミーティング';
  @override
  String get noRecentMeetings => '最近のミーティングはありません';
  @override
  String get rejoin => '再参加';
  @override
  String get displayName => '表示名';
  @override
  String get displayNameHint => '他の参加者に表示される名前';
  @override
  String get spokenLanguage => '話す言語';
  @override
  String get targetLanguage => '翻訳言語';
  @override
  String get vietnamese => 'ベトナム語';
  @override
  String get japanese => '日本語';
  @override
  String get english => '英語';
  @override
  String get cameraOn => 'カメラオン';
  @override
  String get cameraOff => 'カメラオフ';
  @override
  String get micOn => 'マイクオン';
  @override
  String get micOff => 'マイクオフ';
  @override
  String get cameraPreview => 'カメラプレビュー';
  @override
  String get cameraUnavailable => 'カメラプレビューを利用できません';
  @override
  String get micLevel => 'マイクレベル';
  @override
  String get prejoinTitle => '参加準備';
  @override
  String get prejoinSubtitle => 'カメラ、マイク、言語を確認してください';
  @override
  String get joinNow => '今すぐ参加';
  @override
  String get leaveMeeting => 'ミーティングを退出';
  @override
  String get invalidMeetingCode => '無効なミーティングコード';
  @override
  String get meetingNotFound => 'ミーティングが見つかりません';
  @override
  String get meetingEnded => 'ミーティングは終了またはロックされています';
  @override
  String get createMeetingUnauthorized =>
      'ミーティング作成にはホスト認証が必要です';
  @override
  String get networkError => 'ネットワークエラー。接続を確認してください。';
  @override
  String get unexpectedError => '問題が発生しました。もう一度お試しください。';
  @override
  String get displayNameRequired => '表示名を入力してください';
  @override
  String get loading => '読み込み中...';
  @override
  String get creatingMeeting => 'ミーティングを作成中...';
  @override
  String get joiningMeeting => '参加中...';
  @override
  String get permissionRequiredTitle => '権限が必要です';
  @override
  String get permissionRequiredBody =>
      'カメラまたはマイクの権限が拒否されています。設定から有効にしてください。';
  @override
  String get openSettings => '設定を開く';
  @override
  String get cancel => 'キャンセル';
  @override
  String get meetingRoomPlaceholder =>
      'ミーティングルームは Task 5 向けに準備中です';
  @override
  String get meetingRoomPlaceholderBody =>
      'トークンの準備は完了しました。次に LiveKit ビデオグリッドを実装します。';
  @override
  String get backToHome => 'ホームに戻る';
  @override
  String get participantIdLabel => '参加者';
  @override
  String get meetingCodeLabel => 'コード';
  @override
  String get waitingForParticipants => '参加者を待っています…';
  @override
  String get reconnecting => 'ミーティングに再接続しています…';
  @override
  String get livekitConnectFailed => 'ミーティングルームに接続できませんでした';
  @override
  String get cameraToggleFailed => 'カメラを切り替えできませんでした';
  @override
  String get micToggleFailed => 'マイクを切り替えできませんでした';
  @override
  String get youLabel => 'あなた';
  @override
  String get subtitleReconnecting => '字幕を再接続しています…';
  @override
  String get subtitleUnavailable => '字幕を利用できません';
  @override
  String get subtitlePartial => '認識中…';
  @override
  String get subtitleConnectFailed => '字幕ストリームに接続できませんでした';
  @override
  String get tagDecision => '決定';
  @override
  String get tagActionItem => 'アクション';
  @override
  String get flipCamera => 'カメラ切替';
  @override
  String get speakerOn => 'スピーカーオン';
  @override
  String get speakerOff => 'スピーカーオフ';
  @override
  String get leaveMeetingConfirmTitle => '退出しますか？';
  @override
  String get leaveMeetingConfirmBody =>
      'ビデオ、音声、字幕の接続が切断されます。';
  @override
  String get errorTitle => 'エラーが発生しました';
  @override
  String get retry => '再試行';
  @override
  String get networkExcellent => '良好';
  @override
  String get networkGood => '普通';
  @override
  String get networkPoor => '不安定';
  @override
  String get networkUnknown => 'ネットワーク';
  @override
  String get cameraFlipFailed => 'カメラを切り替えできませんでした';
  @override
  String get speakerToggleFailed => 'スピーカーを切り替えできませんでした';
  @override
  String get networkReconnectFailed => 'ミーティングに再接続できませんでした';
  @override
  String get networkReconnecting => 'ネットワークが不安定です — 再接続中…';
  @override
  String get networkRestored => '接続が復旧しました';
  @override
  String get videoDegraded => '通話品質のためカメラを一時停止しました';
  @override
  String get cameraFlipped => 'カメラを切り替えました';
}
