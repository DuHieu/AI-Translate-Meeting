import json

with open('/tmp/benchmark_fleurs_2000_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for lang in ['vi', 'en', 'ja']:
    sub = [d for d in data if d['lang'] == lang]
    sub_sorted = sorted(sub, key=lambda x: x['similarity'], reverse=True)
    lang_name = {"vi": "TIẾNG VIỆT", "en": "TIẾNG ANH", "ja": "TIẾNG NHẬT"}[lang]
    print(f"\n==========================================")
    print(f"        VÍ DỤ THỰC TẾ: {lang_name} ({lang.upper()})")
    print(f"==========================================")
    print(f"--- 1. Câu nhận diện CHÍNH XÁC CAO (Top 2): ---")
    for item in sub_sorted[:2]:
        print(f"  [Độ tương đồng: {item['similarity']}%, Ký tự đúng: {item['char_acc']}%, Từ đúng: {item['word_acc']}%]")
        print(f"  * Gốc (Ref):  \"{item['reference']}\"")
        print(f"  * AI nhận:    \"{item['predicted']}\"")
    print(f"\n--- 2. Câu nhận diện TRUNG BÌNH (Khoảng 80%): ---")
    mid = len(sub_sorted) // 2
    for item in sub_sorted[mid:mid+2]:
        print(f"  [Độ tương đồng: {item['similarity']}%, Ký tự đúng: {item['char_acc']}%, Từ đúng: {item['word_acc']}%]")
        print(f"  * Gốc (Ref):  \"{item['reference']}\"")
        print(f"  * AI nhận:    \"{item['predicted']}\"")
    print(f"\n--- 3. Câu nhận diện KÉM / NHIỄU (Bottom 2): ---")
    for item in sub_sorted[-2:]:
        print(f"  [Độ tương đồng: {item['similarity']}%, Ký tự đúng: {item['char_acc']}%, Từ đúng: {item['word_acc']}%]")
        print(f"  * Gốc (Ref):  \"{item['reference']}\"")
        print(f"  * AI nhận:    \"{item['predicted']}\"")
