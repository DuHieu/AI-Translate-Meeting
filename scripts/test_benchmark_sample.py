import os
import jiwer
from rapidfuzz import fuzz
from faster_whisper import WhisperModel
from huggingface_hub import hf_hub_download

def normalize_text(text: str) -> str:
    import re
    t = text.lower().strip()
    # Remove punctuation
    t = re.sub(r'[.,\/#!$%\^&\*;:{}=\-_`~()?"\']', ' ', t)
    # Remove fullwidth punctuation (for Japanese/Chinese)
    t = re.sub(r'[、。！？「」『』（）［］【】]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def main():
    print("=== TESTING SAMPLE INFERENCE ON FLEURS ===")
    model = WhisperModel("base", device="cpu", compute_type="int8", cpu_threads=4)
    
    test_cases = [
        ("vi_vn", "vi"),
        ("en_us", "en"),
        ("ja_jp", "ja"),
    ]
    
    for folder, lang in test_cases:
        tsv_path = hf_hub_download(repo_id='google/fleurs', filename=f'data/{folder}/test.tsv', repo_type='dataset')
        with open(tsv_path, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) >= 3:
                    audio_filename = parts[1]
                    ref_text = parts[2]
                    audio_path = f"/tmp/fleurs/{folder}/test/{audio_filename}"
                    if os.path.exists(audio_path):
                        print(f"\n[{folder.upper()}] Testing file: {audio_filename}")
                        print(f"  Reference Ground Truth: \"{ref_text}\"")
                        
                        segments, info = model.transcribe(audio_path, language=lang, beam_size=2)
                        hyp_text = "".join(s.text for s in segments).strip()
                        print(f"  Whisper Base Predicted: \"{hyp_text}\" (detected lang: {info.language}, prob: {info.language_probability:.2f})")
                        
                        norm_ref = normalize_text(ref_text)
                        norm_hyp = normalize_text(hyp_text)
                        
                        similarity = fuzz.ratio(norm_ref, norm_hyp)
                        cer = jiwer.cer(norm_ref, norm_hyp) if norm_ref else 0.0
                        wer = jiwer.wer(norm_ref, norm_hyp) if norm_ref else 0.0
                        
                        print(f"  Normalized Ref: \"{norm_ref}\"")
                        print(f"  Normalized Hyp: \"{norm_hyp}\"")
                        print(f"  WER: {wer*100:.1f}%, CER: {cer*100:.1f}%, Fuzzy Similarity: {similarity:.1f}%")
                        break

if __name__ == "__main__":
    main()
