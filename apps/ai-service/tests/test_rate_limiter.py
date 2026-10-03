from app.security.rate_limiter import WebSocketRateLimiter
from app.security.client_ip import resolve_client_ip


def test_rate_limiter_allows_under_limit_and_blocks_excess():
    limiter = WebSocketRateLimiter(redis_host="127.0.0.1", redis_port=1, limit=5, window_seconds=60)
    client_ip = "192.168.1.100"

    # First 5 should succeed
    for _ in range(5):
        assert limiter.is_allowed(client_ip) is True

    # 6th should be blocked
    assert limiter.is_allowed(client_ip) is False


def test_rate_limiter_isolates_different_ips():
    limiter = WebSocketRateLimiter(redis_host="127.0.0.1", redis_port=1, limit=3, window_seconds=60)
    ip_a = "10.0.0.1"
    ip_b = "10.0.0.2"

    for _ in range(3):
        assert limiter.is_allowed(ip_a) is True

    # ip_a is now rate-limited
    assert limiter.is_allowed(ip_a) is False

    # ip_b is unaffected
    assert limiter.is_allowed(ip_b) is True


def test_untrusted_peer_cannot_spoof_forwarded_ip():
    assert resolve_client_ip(
        peer_ip="198.51.100.10",
        forwarded_for="203.0.113.20",
        trusted_proxy_ips={"172.30.0.10"},
    ) == "198.51.100.10"


def test_trusted_proxy_uses_valid_forwarded_client_ip():
    assert resolve_client_ip(
        peer_ip="172.30.0.10",
        forwarded_for="203.0.113.20",
        trusted_proxy_ips={"172.30.0.10"},
    ) == "203.0.113.20"


def test_trusted_proxy_rejects_malformed_or_chained_forwarded_value():
    trusted = {"172.30.0.10"}

    assert resolve_client_ip("172.30.0.10", "not-an-ip", trusted) == "172.30.0.10"
    assert resolve_client_ip("172.30.0.10", "203.0.113.20, 198.51.100.1", trusted) == "172.30.0.10"
