class TranslationProvider:
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> str:
        raise NotImplementedError
