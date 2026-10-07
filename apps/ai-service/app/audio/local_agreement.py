import re
from typing import Optional, Tuple

JAPANESE_KANA_REGEX = re.compile(r"[\u3040-\u309F\u30A0-\u30FF]")
CHINESE_CJK_REGEX = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF]")


class LocalAgreement:
    """
    Prefix Match Commit (Local Agreement) algorithm for streaming ASR subtitles.
    Detects stable prefixes across consecutive interim chunks to commit early (isFinal=True),
    cutting perceived translation latency to <200ms without waiting for natural speech pause.
    """
    def __init__(self, min_words: int = 3, min_cjk_chars: int = 6):
        self.min_words = min_words
        self.min_cjk_chars = min_cjk_chars
        self.committed_text: str = ""
        self.last_uncommitted_tokens: list[str] = []

    def reset(self) -> None:
        """Resets the committer state at the start or completion of an utterance."""
        self.committed_text = ""
        self.last_uncommitted_tokens = []

    def process(self, text: str, is_final: bool = False) -> Tuple[Optional[str], str]:
        """
        Processes an interim or final transcript.

        Returns:
            (committed_segment, remaining_interim)
            - committed_segment: text chunk committed as final in this step (or None if none)
            - remaining_interim: current uncommitted text to broadcast as interim
        """
        text = text.strip()
        if not text:
            return None, ""

        if is_final:
            uncommitted = text
            if self.committed_text and text.startswith(self.committed_text):
                uncommitted = text[len(self.committed_text):].strip()
            self.reset()
            return (uncommitted if uncommitted else None), ""

        # Strip already committed prefix from current text
        uncommitted = text
        if self.committed_text and text.startswith(self.committed_text):
            uncommitted = text[len(self.committed_text):].strip()

        if not uncommitted:
            return None, ""

        curr_tokens = uncommitted.split()
        if not curr_tokens:
            return None, ""

        # Compute Longest Common Prefix (LCP) with previous uncommitted tokens
        lcp: list[str] = []
        for t1, t2 in zip(self.last_uncommitted_tokens, curr_tokens):
            if t1 == t2:
                lcp.append(t1)
            else:
                break

        # Check threshold: min_words or min_cjk_chars
        is_cjk = any(CHINESE_CJK_REGEX.search(t) or JAPANESE_KANA_REGEX.search(t) for t in lcp)
        commit_ready = False
        if is_cjk:
            cjk_char_count = sum(len(t) for t in lcp)
            if cjk_char_count >= self.min_cjk_chars:
                commit_ready = True
        else:
            if len(lcp) >= self.min_words:
                commit_ready = True

        if commit_ready:
            committed_segment = " ".join(lcp).strip()
            if self.committed_text:
                self.committed_text = (self.committed_text + " " + committed_segment).strip()
            else:
                self.committed_text = committed_segment

            remaining_tokens = curr_tokens[len(lcp):]
            self.last_uncommitted_tokens = remaining_tokens
            remaining_text = " ".join(remaining_tokens).strip()
            return committed_segment, remaining_text

        # Not yet ready to commit: update last_uncommitted_tokens for next comparison
        self.last_uncommitted_tokens = curr_tokens
        return None, uncommitted
