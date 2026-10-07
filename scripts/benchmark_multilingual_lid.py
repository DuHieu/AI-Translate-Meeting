"""
Empirical Multilingual Language Identification (LID) Benchmark
Tests audio-level and text-level language identification across:
Vietnamese (vi), English (en), Japanese (ja), Korean (ko), Chinese (zh), French (fr), German (de), Spanish (es)
"""
import glob
import json
import os
import random
import sys
import time
from pathlib import Path
import numpy as np

# Ensure app is in path
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "ai-service")))

from app.speech.whisper_service import SpeechToTextService, detect_text_language

AUDIO_DIRS = {
    "vi": ("/tmp/fleurs/vi_vn/test", "Tiếng Việt"),
    "en": ("/tmp/fleurs/en_us/test", "Tiếng Anh"),
    "ja": ("/tmp/fleurs/ja_jp/test", "Tiếng Nhật"),
    "ko": ("/tmp/fleurs/ko_kr/test", "Tiếng Hàn"),
    "zh": ("/tmp/fleurs/zh_cn/test", "Tiếng Trung"),
}

SAMPLE_TEXTS = {
    "vi": [
        "Xin chào các bạn, chúng ta bắt đầu cuộc họp dự án hôm nay.",
        "Anh Nam gửi báo cáo tiến độ trước mười bảy giờ nhé.",
        "Chúng ta thống nhất chốt giải pháp triển khai trên hạ tầng đám mây.",
        "Tiến độ sprint này cần hoàn thành đúng hạn vào thứ sáu tới.",
        "Có ai có câu hỏi hay ý kiến đóng góp gì thêm không?",
    ],
    "en": [
        "Hello everyone, let's start today's project review meeting.",
        "Please send the progress report before 5 PM today.",
        "We agreed to deploy the new microservices architecture on AWS.",
        "The sprint backlog needs to be completed by this Friday.",
        "Does anyone have any questions or additional feedback?",
    ],
    "ja": [
        "皆さん、こんにちは。本日のプロジェクト定例会議を始めましょう。",
        "本日の17時までに進捗報告書を提出してください。",
        "AWSでのシステム構築方針について合意しました。",
        "今週の金曜日までにスプリントの開発を完了させる必要があります。",
        "何かご質問やご意見はありますでしょうか？",
    ],
    "ko": [
        "안녕하세요 여러분, 오늘 프로젝트 회의를 시작하겠습니다.",
        "오늘 오후 5시까지 진행 보고서를 제출해 주세요.",
        "클라우드 인프라 배포 방안에 대해 최종 합의했습니다.",
        "이번 주 금요일까지 스프린트 작업을 완료해야 합니다.",
        "추가 질문이나 의견이 있으신 분 계신가요?",
    ],
    "zh": [
        "大家好，我们现在开始今天的项目例会。",
        "请在今天下午五点之前提交进度报告。",
        "我们一致同意在云端部署新的微服务架构。",
        "本周五之前必须完成当前敏捷周期的开发任务。",
        "大家还有什么问题或者建议吗？",
    ],
    "fr": [
        "Bonjour à tous, commençons notre réunion de projet aujourd'hui.",
        "Merci d'envoyer le rapport d'avancement avant 17 heures.",
        "Nous sommes convenus de déployer la solution sur le cloud.",
        "L'ordre du jour comprend la revue de sprint et les prochaines étapes.",
        "Est-ce que quelqu'un a des questions ou des remarques?",
    ],
    "de": [
        "Guten Morgen alle zusammen, beginnen wir mit unserer Besprechung.",
        "Bitte senden Sie den Bericht bis heute 17 Uhr.",
        "Wir haben uns auf die Bereitstellung in der Cloud geeinigt.",
        "Die nächste Besprechung findet kommenden Freitag statt.",
        "Gibt es noch Fragen oder Anmerkungen von Ihrer Seite?",
    ],
    "es": [
        "Hola a todos, empecemos la reunión de proyecto de hoy.",
        "Por favor envíen el informe de avance antes de las cinco de la tarde.",
        "Hemos acordado desplegar la solución en la nube.",
        "La agenda de la reunión incluye la revisión del sprint.",
        "¿Alguien tiene alguna pregunta o comentario adicional?",
    ],
}


def benchmark_text_lid():
    print("=" * 65)
    print("PHẦN 1: BENCHMARK PHÁT HIỆN NGÔN NGỮ QUA VĂN BẢN (TEXT-LEVEL LID)")
    print("=" * 65)
    total_samples = 0
    correct_samples = 0
    results = {}

    for lang, sentences in SAMPLE_TEXTS.items():
        lang_correct = 0
        conf_scores = []
        for s in sentences:
            pred_lang, conf = detect_text_language(s, fallback_lang="vi")
            is_correct = (pred_lang == lang)
            if is_correct:
                lang_correct += 1
            conf_scores.append(conf)

        acc = (lang_correct / len(sentences)) * 100
        avg_conf = sum(conf_scores) / len(conf_scores) * 100
        results[lang] = {"accuracy": acc, "avg_confidence": avg_conf, "samples": len(sentences)}
        total_samples += len(sentences)
        correct_samples += lang_correct

        status = "✅ PASS" if acc == 100 else f"⚠️ {acc:.1f}%"
        print(f"  {status} [{lang.upper()}]: Độ chính xác={acc:>5.1f}% | Độ tin cậy TB={avg_conf:>5.1f}% ({len(sentences)} mẫu)")

    overall_acc = (correct_samples / total_samples) * 100
    print(f"\n  👉 Tổng kết Text LID: {correct_samples}/{total_samples} đúng ({overall_acc:.1f}%)\n")
    return results


def benchmark_audio_lid(stt_service: SpeechToTextService, n_samples_per_lang: int = 25):
    print("=" * 65)
    print("PHẦN 2: BENCHMARK PHÁT HIỆN NGÔN NGỮ QUA AUDIO THẬT (AUDIO-LEVEL LID)")
    print("=" * 65)

    audio_results = {}
    confusion = {}

    for true_lang, (dir_path, label) in AUDIO_DIRS.items():
        # Find wav files
        wav_files = glob.glob(f"{dir_path}/*.wav") + glob.glob(f"{dir_path}/**/*.wav", recursive=True)
        if not wav_files:
            print(f"  [SKIP] {label} ({true_lang}): Chưa có file audio tại {dir_path}")
            continue

        selected = random.sample(wav_files, min(n_samples_per_lang, len(wav_files)))
        print(f"\n  [AUDIO LID] Kiểm tra {label} ({true_lang.upper()}) với {len(selected)} mẫu thật...")

        correct = 0
        latencies = []
        confidences = []
        pred_distribution = {}

        for wav in selected:
            t0 = time.perf_counter()
            try:
                with open(wav, "rb") as f:
                    audio_bytes = f.read()

                pred_lang, prob = stt_service.detect_language_sync(audio_bytes)
                latency = (time.perf_counter() - t0) * 1000
                latencies.append(latency)
                confidences.append(prob)

                pred_distribution[pred_lang] = pred_distribution.get(pred_lang, 0) + 1
                if pred_lang == true_lang:
                    correct += 1
                else:
                    pair_key = f"{true_lang} -> {pred_lang}"
                    confusion[pair_key] = confusion.get(pair_key, 0) + 1
            except Exception as e:
                print(f"    Lỗi xử lý {os.path.basename(wav)}: {e}")

        acc = (correct / len(selected)) * 100 if selected else 0
        avg_lat = sum(latencies) / len(latencies) if latencies else 0
        avg_prob = sum(confidences) / len(confidences) * 100 if confidences else 0

        audio_results[true_lang] = {
            "label": label,
            "samples": len(selected),
            "correct": correct,
            "accuracy": round(acc, 2),
            "avg_latency_ms": round(avg_lat, 1),
            "avg_confidence": round(avg_prob, 1),
            "predictions": pred_distribution,
        }

        status = "✅ XUẤT SẮC" if acc >= 90 else ("⚠️ TỐT" if acc >= 75 else "❌ CẦN CẢI THIỆN")
        print(f"    {status}: Độ chính xác={acc:.1f}% ({correct}/{len(selected)}) | Confidence={avg_prob:.1f}% | Latency={avg_lat:.1f}ms")
        print(f"    Phân bổ dự đoán: {pred_distribution}")

    print("\n" + "=" * 65)
    print("BẢNG TỔNG HỢP NHẬN DIỆN NGÔN NGỮ TỰ ĐỘNG (AUDIO LID)")
    print("=" * 65)
    header = f"{'Ngôn ngữ':<15} {'Mẫu':<6} {'Chính xác':<12} {'Tin cậy TB':<12} {'Độ trễ TB':<12}"
    print(header)
    print("─" * 60)
    for lang, res in audio_results.items():
        print(f"{res['label']:<15} {res['samples']:<6} {res['accuracy']:>6.1f}%     {res['avg_confidence']:>6.1f}%     {res['avg_latency_ms']:>6.1f}ms")

    if confusion:
        print("\nCác trường hợp nhầm lẫn phát hiện:")
        for pair, cnt in sorted(confusion.items(), key=lambda x: -x[1]):
            print(f"  - {pair}: {cnt} lần")
    else:
        print("\nKhông phát hiện bất kỳ trường hợp nhầm lẫn nào giữa các ngôn ngữ!")

    return audio_results


def main():
    random.seed(42)
    # 1. Text LID
    text_results = benchmark_text_lid()

    # 2. Audio LID
    stt = SpeechToTextService(model_size="base")
    stt._ensure_model_loaded()
    audio_results = benchmark_audio_lid(stt, n_samples_per_lang=25)

    # Save summary
    out_file = "/tmp/multilingual_lid_benchmark_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"text_lid": text_results, "audio_lid": audio_results}, f, ensure_ascii=False, indent=2)
    print(f"\nKết quả đầy đủ đã lưu tại: {out_file}")


if __name__ == "__main__":
    main()
