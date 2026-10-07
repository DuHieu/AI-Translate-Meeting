import os
import tarfile
from huggingface_hub import hf_hub_download

def main():
    print("=== EXTRACTING FLEURS AUDIO FILES ===")
    langs = ['en_us', 'vi_vn', 'ja_jp']
    for lang in langs:
        dest_dir = f"/tmp/fleurs/{lang}"
        os.makedirs(dest_dir, exist_ok=True)
        test_dir = os.path.join(dest_dir, "test")
        
        if os.path.exists(test_dir) and len(os.listdir(test_dir)) > 500:
            print(f"[{lang}] Already extracted: {len(os.listdir(test_dir))} files in {test_dir}")
            continue
            
        p = hf_hub_download(repo_id='google/fleurs', filename=f'data/{lang}/audio/test.tar.gz', repo_type='dataset')
        print(f"[{lang}] Extracting {p} -> {dest_dir}...")
        with tarfile.open(p, 'r:gz') as tar:
            tar.extractall(path=dest_dir)
        print(f"[{lang}] Extracted {len(os.listdir(test_dir))} files successfully.")

if __name__ == "__main__":
    main()
