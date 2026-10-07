import pytest
from app.speech.whisper_service import detect_text_language


def test_detect_arabic_script():
    ar_text = "مرحبا بكم جميعا، دعونا نبدأ اجتماع اليوم."
    lang, conf = detect_text_language(ar_text)
    assert lang == "ar"
    assert conf >= 0.95


def test_detect_thai_script():
    th_text = "สวัสดีทุกคน ขอเริ่มการประชุมวันนี้เลยครับ"
    lang, conf = detect_text_language(th_text)
    assert lang == "th"
    assert conf >= 0.95


def test_detect_indonesian_meeting_text():
    id_text = "Selamat pagi semua, kita mulai rapat proyek hari ini."
    lang, conf = detect_text_language(id_text)
    assert lang == "id"
    assert conf >= 0.80


def test_detect_tagalog_meeting_text():
    tl_text = "Magandang araw sa inyong lahat, simulan na natin ang pulong."
    lang, conf = detect_text_language(tl_text)
    assert lang == "tl"
    assert conf >= 0.80


def test_detect_french_meeting_text():
    fr_text = "Bonjour à tous, commençons notre réunion de projet aujourd'hui."
    lang, conf = detect_text_language(fr_text)
    assert lang == "fr"
    assert conf >= 0.80


def test_detect_english_meeting_text():
    en_text = "Hello everyone, let's start today's project review meeting."
    lang, conf = detect_text_language(en_text)
    assert lang == "en"
    assert conf >= 0.80
