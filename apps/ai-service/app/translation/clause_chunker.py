"""
Semantic Clause Chunker for Real-Time Streaming Speech Translation & Voice Dubbing.
Splits continuous live translations into natural prosodic clauses to achieve < 250ms TTS latency.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


@dataclass
class ClauseChunk:
    text: str
    index: int
    is_terminal: bool
    word_count: int


# Punctuation boundary patterns across multilingual text (VI, EN, JA, KO, ZH)
_PUNCTUATION_SPLIT_REGEX = re.compile(r"([,;:!?.—–~、。！？])\s*")

# High-frequency clause conjunction delimiters when clauses grow beyond 30 characters
_CONJUNCTION_DELIMITERS = {
    "vi": re.compile(
        r"\s+(và|nhưng|hoặc|đồng thời|sau đó|bởi vì|cho nên|do đó|trong khi|mặc dù)\s+",
        re.IGNORECASE,
    ),
    "en": re.compile(
        r"\s+(and|but|or|however|because|therefore|meanwhile|although|while)\s+",
        re.IGNORECASE,
    ),
    "ja": re.compile(
        r"(そして|しかし|だから|または|なお|ですから|けれども)",
    ),
}


class ClauseChunker:
    """
    Splits live translation text into prosodic clause chunks for streaming TTS.
    Maintains semantic coherence and avoids awkward mid-word or single-word stutters.
    """

    def __init__(
        self,
        min_chars: int = 12,
        max_chars: int = 85,
        min_words: int = 3,
    ) -> None:
        self.min_chars = min_chars
        self.max_chars = max_chars
        self.min_words = min_words

    def split_into_clauses(self, text: str, lang: str = "vi") -> List[ClauseChunk]:
        """
        Split a sentence or multi-sentence translation into a sequence of semantic clauses.
        """
        cleaned = (text or "").strip()
        if not cleaned:
            return []

        # 1. First-pass split by punctuation boundaries
        raw_parts: List[str] = []
        tokens = _PUNCTUATION_SPLIT_REGEX.split(cleaned)
        
        current_segment = ""
        for token in tokens:
            if not token:
                continue
            if _PUNCTUATION_SPLIT_REGEX.fullmatch(token):
                # Punctuation attached to preceding segment
                current_segment += token
                raw_parts.append(current_segment.strip())
                current_segment = ""
            else:
                if current_segment:
                    raw_parts.append(current_segment.strip())
                current_segment = token

        if current_segment.strip():
            raw_parts.append(current_segment.strip())

        # If text had no punctuation, check conjunction delimiters or max length
        if len(raw_parts) <= 1 and len(cleaned) > self.max_chars:
            conj_regex = _CONJUNCTION_DELIMITERS.get(lang.lower().split("-")[0])
            if conj_regex:
                split_conj = conj_regex.split(cleaned)
                raw_parts = []
                buf = ""
                for part in split_conj:
                    part_str = part.strip()
                    if not part_str:
                        continue
                    if len(buf) + len(part_str) > self.max_chars:
                        if buf:
                            raw_parts.append(buf.strip())
                        buf = part_str
                    else:
                        buf = f"{buf} {part_str}".strip() if buf else part_str
                if buf:
                    raw_parts.append(buf.strip())

        # 2. Merge short fragments that don't meet min_chars / min_words
        merged_clauses: List[str] = []
        accumulator = ""

        for part in raw_parts:
            words = part.split()
            if not accumulator:
                accumulator = part
            else:
                acc_words = accumulator.split()
                if (
                    len(accumulator) < self.min_chars
                    or len(acc_words) < self.min_words
                ):
                    accumulator = f"{accumulator} {part}".strip()
                else:
                    merged_clauses.append(accumulator)
                    accumulator = part

        if accumulator:
            if (
                merged_clauses
                and (
                    len(accumulator) < self.min_chars
                    or len(accumulator.split()) < self.min_words
                )
            ):
                merged_clauses[-1] = f"{merged_clauses[-1]} {accumulator}".strip()
            else:
                merged_clauses.append(accumulator)

        if not merged_clauses:
            merged_clauses = [cleaned]

        # 3. Build ClauseChunk dataclass instances
        results: List[ClauseChunk] = []
        total = len(merged_clauses)
        for i, clause in enumerate(merged_clauses):
            words = clause.split()
            is_terminal = (i == total - 1)
            results.append(
                ClauseChunk(
                    text=clause,
                    index=i,
                    is_terminal=is_terminal,
                    word_count=len(words),
                )
            )

        return results


# Global singleton instance
default_clause_chunker = ClauseChunker()
