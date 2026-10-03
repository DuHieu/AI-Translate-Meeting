import time
import logging
from collections import defaultdict
import redis

logger = logging.getLogger("ai_service")


class WebSocketRateLimiter:
    """Distributed rate limiter for WebSocket handshakes with graceful in-memory fallback."""

    def __init__(
        self,
        redis_host: str = "redis",
        redis_port: int = 6379,
        limit: int = 30,
        window_seconds: int = 60,
    ):
        self.limit = limit
        self.window_seconds = window_seconds
        self.redis_client = None
        self._local_counts: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))

        try:
            r = redis.Redis(
                host=redis_host,
                port=redis_port,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
            r.ping()
            self.redis_client = r
        except Exception:
            # Expected in test/dev environments without running Redis container
            self.redis_client = None

    def is_allowed(self, client_ip: str) -> bool:
        current_window = int(time.time() // self.window_seconds)

        if self.redis_client is not None:
            try:
                key = f"ratelimit:ws:{client_ip}:{current_window}"
                count = self.redis_client.incr(key)
                if count == 1:
                    self.redis_client.expire(key, self.window_seconds + 5)
                return count <= self.limit
            except Exception as e:
                logger.warning("Redis rate limit check failed (%s); falling back to local memory", e)

        # In-memory fallback
        window_num, count = self._local_counts[client_ip]
        if window_num != current_window:
            self._local_counts[client_ip] = (current_window, 1)
            return True

        if count >= self.limit:
            return False

        self._local_counts[client_ip] = (current_window, count + 1)
        return True
