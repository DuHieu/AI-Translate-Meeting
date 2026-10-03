import pytest
from unittest.mock import AsyncMock, patch
import httpx

from app.translation.local_provider import LocalTranslationProvider


@pytest.mark.asyncio
async def test_offline_http_backend_translates_via_internal_service():
    """Verify that offline_http backend calls the internal offline service endpoint."""
    provider = LocalTranslationProvider(
        backend="offline_http",
        offline_service_url="http://offline-translator:5000/translate",
    )

    mock_response = httpx.Response(
        status_code=200,
        json={"translatedText": "これはテストです。"},
        request=httpx.Request("POST", "http://offline-translator:5000/translate"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.translate("Đây là thử nghiệm.", "vi", "ja")

        assert result == "これはテストです。"
        assert mock_post.called
        call_kwargs = mock_post.call_args[1]
        assert call_kwargs["json"]["q"] == "Đây là thử nghiệm."
        assert call_kwargs["json"]["source"] == "vi"
        assert call_kwargs["json"]["target"] == "ja"

    await provider.close()


@pytest.mark.asyncio
async def test_local_dictionary_backend_never_makes_network_calls():
    """Verify that local_dictionary backend never makes any HTTP requests."""
    provider = LocalTranslationProvider(backend="local_dictionary")

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get, \
         patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        
        # Exact known key in sample dict
        result = await provider.translate("Xin chào, chúng ta bắt đầu cuộc họp nhé.", "vi", "ja")
        assert result == "こんにちは、会議を始めましょう。"
        assert not mock_get.called
        assert not mock_post.called

        # Unknown text falls back safely without calling external network
        unknown_result = await provider.translate("Một câu bất kỳ chưa có trong từ điển", "vi", "ja")
        assert "[JA]" in unknown_result
        assert not mock_get.called
        assert not mock_post.called

    await provider.close()


@pytest.mark.asyncio
async def test_offline_backend_gracefully_falls_back_on_timeout_or_error():
    """Verify that offline HTTP failure falls back to safe tagged text without throwing."""
    provider = LocalTranslationProvider(
        backend="offline_http",
        offline_service_url="http://unreachable:5000/translate",
    )

    with patch.object(httpx.AsyncClient, "post", side_effect=httpx.ConnectError("Connection refused")):
        result = await provider.translate("Tin nhắn thử nghiệm lỗi mạng", "vi", "ja")
        assert "[JA] Tin nhắn thử nghiệm lỗi mạng" in result

    await provider.close()
