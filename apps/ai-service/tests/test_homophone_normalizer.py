import pytest
from app.audio.homophone_normalizer import AcousticHomophoneNormalizer, homophone_normalizer

def test_homophone_normalizer_recovers_aws_deployment():
    raw = "Chúng ta thống nhất cho giải pháp triển hai trên AWS"
    normalized = homophone_normalizer.normalize(raw, language="vi")
    assert "triển khai trên AWS" in normalized

def test_homophone_normalizer_recovers_deadline_and_report():
    raw = "Anh Nam gửi bảo cáo dự án trước mời bởi giơ hôm nay nhé"
    normalized = homophone_normalizer.normalize(raw, language="vi")
    assert "báo cáo dự án" in normalized
    assert "17 giờ" in normalized

def test_homophone_normalizer_recovers_devops_terms():
    raw = "Deploy qua đốc cơ và cúp bơ nét sau khi merge pi rờ trên ghít hắp"
    normalized = homophone_normalizer.normalize(raw, language="vi")
    assert "Docker" in normalized
    assert "Kubernetes" in normalized
    assert "PR" in normalized
    assert "GitHub" in normalized

def test_homophone_normalizer_custom_glossary():
    custom = AcousticHomophoneNormalizer({"xếp tùng": "Sếp Tùng", "áp bờ": "Apple"})
    res = custom.normalize("Gặp xếp tùng bàn về cổ phiếu áp bờ", language="vi")
    assert "Sếp Tùng" in res
    assert "Apple" in res

def test_homophone_normalizer_ignores_non_vietnamese():
    en = "We will meet at 5 pm"
    assert homophone_normalizer.normalize(en, language="en") == en

def test_homophone_normalizer_empirical_speech_patterns():
    raw = "Mặc khác, trút giải pháp truyền khai trên AWS, băng và tích khiến giao thông dần như dáng đoạn quân năm"
    normalized = homophone_normalizer.normalize(raw, language="vi")
    assert "Mặt khác" in normalized
    assert "chốt giải pháp triển khai trên AWS" in normalized
    assert "băng và tuyết" in normalized
    assert "gần như gián đoạn quanh năm" in normalized


def test_homophone_normalizer_chinese_simplified_standardization():
    traditional = "這是一個測試項目，我們需要討論該項目的進度"
    simplified = homophone_normalizer.normalize(traditional, language="zh")
    # Verify OpenCC converts key characters: 這->这, 個->个, 測->测, 試->试, 項->项, 們->们, 進->进
    assert "这是一个测试项目" in simplified
    assert "我们需要讨论该项目的进度" in simplified


def test_homophone_normalizer_chinese_traditional_for_tw():
    simplified = "这是一个测试项目"
    traditional = homophone_normalizer.normalize(simplified, language="zh-TW")
    assert "這是一個測試項目" in traditional


