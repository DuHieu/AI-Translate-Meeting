from pathlib import Path


WEB_SRC = Path(__file__).resolve().parents[1] / "apps" / "web" / "src"


def test_livekit_room_does_not_auto_publish_media_tracks():
    meeting_room = WEB_SRC / "components" / "meeting" / "MeetingRoom.tsx"
    source = meeting_room.read_text(encoding="utf-8")

    assert "audio={false}" in source
    assert "video={false}" in source
    assert "session.initialMicOn" not in source
    assert "session.initialCameraOn" not in source


def test_meeting_shell_publishes_initial_media_sequentially_with_selected_devices():
    meeting_shell = WEB_SRC / "components" / "meeting" / "MeetingShell.tsx"
    source = meeting_shell.read_text(encoding="utf-8")

    mic_publish = "await localParticipant.setMicrophoneEnabled(true, buildAudioOptions())"
    camera_publish = "await localParticipant.setCameraEnabled(true, buildVideoOptions())"

    assert mic_publish in source
    assert camera_publish in source
    assert source.index(mic_publish) < source.index(camera_publish)
    assert "session.audioDeviceId" in source
    assert "session.videoDeviceId" in source


def test_prejoin_falls_back_to_separate_media_requests_when_combined_request_fails():
    prejoin_page = WEB_SRC / "pages" / "PreJoinPage.tsx"
    source = prejoin_page.read_text(encoding="utf-8")

    assert "Combined media request failed; retrying devices separately" in source
    assert "audio: audioConstraint" in source
    assert "video: false" in source
    assert "audio: false" in source
    assert "video: videoConstraint" in source


def test_prejoin_clears_device_permission_error_when_media_is_disabled():
    prejoin_page = WEB_SRC / "pages" / "PreJoinPage.tsx"
    source = prejoin_page.read_text(encoding="utf-8")

    disabled_branch = source.index("if (!isCameraOn && !isMicOn)")
    clear_error = source.index("setPermissionError(null);", disabled_branch)
    early_return = source.index("return;", disabled_branch)

    assert clear_error < early_return


def test_subtitle_audio_chunks_match_realtime_latency_contract():
    subtitle_hook = WEB_SRC / "hooks" / "useSubtitle.ts"
    source = subtitle_hook.read_text(encoding="utf-8")

    assert "const AUDIO_CHUNK_MS = 350;" in source
