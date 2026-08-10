from app.translation.base import TranslationProvider


class LocalTranslationProvider(TranslationProvider):
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> str:
        if source_language == target_language:
            return text

        sample_dict = {
            ("vi", "ja", "Xin chào, chúng ta bắt đầu cuộc họp nhé."): "こんにちは、会議を始めましょう。",
            ("vi", "en", "Xin chào, chúng ta bắt đầu cuộc họp nhé."): "Hello, let's start the meeting.",
            ("ja", "vi", "はい、始めましょう。"): "Vâng, chúng ta bắt đầu nhé.",
            ("ja", "en", "はい、始めましょう。"): "Yes, let's start.",
        }

        key = (source_language, target_language, text.strip())
        if key in sample_dict:
            return sample_dict[key]

        return f"[{target_language.upper()}] {text}"
