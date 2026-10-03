from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_frontend_nginx_applies_security_headers_to_html_and_assets():
    nginx_config = (ROOT / "apps" / "web" / "nginx.conf").read_text(encoding="utf-8")
    security_snippet_path = ROOT / "apps" / "web" / "security-headers.conf"

    assert security_snippet_path.exists(), "Reusable nginx security-header snippet is required"
    assert nginx_config.count("include /etc/nginx/snippets/security-headers.conf;") >= 3

    security_headers = security_snippet_path.read_text(encoding="utf-8")
    for header in (
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Content-Security-Policy",
        "Strict-Transport-Security",
    ):
        assert f"add_header {header}" in security_headers

    assert "'unsafe-eval'" not in security_headers
    assert "connect-src 'self' ws: wss:" in security_headers


def test_frontend_does_not_load_styles_blocked_by_its_own_csp():
    index_html = (ROOT / "apps" / "web" / "index.html").read_text(encoding="utf-8")

    assert "fonts.googleapis.com" not in index_html
    assert "fonts.gstatic.com" not in index_html


def test_livekit_sdk_does_not_log_connection_urls_or_access_tokens():
    meeting_room = (ROOT / "apps" / "web" / "src" / "components" / "meeting" / "MeetingRoom.tsx").read_text(
        encoding="utf-8"
    )

    assert "setLogLevel(LogLevel.silent)" in meeting_room
