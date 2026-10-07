import asyncio
import numpy as np
from app.speech.whisper_service import SpeechToTextService

async def main():
    print("=== SO SÁNH ĐỘ CHÍNH XÁC: WHISPER TINY VS WHISPER BASE TRÊN FILE VOICE THẬT ===")
    
    stt_tiny = SpeechToTextService(model_size="tiny")
    stt_base = SpeechToTextService(model_size="base")
    
    clips = [
        ("/tmp/vi_clip1_16k.pcm", "Clip 1 - Chào hỏi"),
        ("/tmp/vi_clip2_16k.pcm", "Clip 2 - Giao việc & Deadline"),
        ("/tmp/vi_clip3_16k.pcm", "Clip 3 - Quyết định kiến trúc AWS"),
    ]
    
    for path, label in clips:
        with open(path, "rb") as f:
            pcm = f.read()
        audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        duration = len(audio) / 16000.0
        
        # Test Tiny
        t0 = asyncio.get_event_loop().time()
        res_tiny = await stt_tiny.transcribe(audio, language="vi", is_final=True)
        cost_tiny = asyncio.get_event_loop().time() - t0
        
        # Test Base
        t0 = asyncio.get_event_loop().time()
        res_base = await stt_base.transcribe(audio, language="vi", is_final=True)
        cost_base = asyncio.get_event_loop().time() - t0
        
        print(f"\n[{label}] ({duration:.2f}s audio):")
        print(f"  ❌ WHISPER TINY (Cũ): \"{res_tiny.text}\" (confidence: {res_tiny.language_probability:.2f}, thời gian: {cost_tiny:.2f}s)")
        print(f"  ✅ WHISPER BASE (Mới): \"{res_base.text}\" (confidence: {res_base.language_probability:.2f}, thời gian: {cost_base:.2f}s)")

if __name__ == "__main__":
    asyncio.run(main())
