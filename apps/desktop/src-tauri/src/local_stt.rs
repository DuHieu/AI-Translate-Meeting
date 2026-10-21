//! On-device streaming speech recognition (sherpa-onnx Zipformer-RNNT).
//!
//! Desktop clients transcribe locally and only send text to the server
//! (`client_transcript` protocol), so the server spends no STT CPU / API cost.

use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Sender};
use std::sync::Arc;
use std::thread;

use serde::Serialize;
use sherpa_onnx::{OnlineRecognizer, OnlineRecognizerConfig, OnlineStream};

const MODEL_REPO: &str = "csukuangfj/sherpa-onnx-streaming-zipformer-ar_en_id_ja_ru_th_vi_zh-2025-02-10";
const MODEL_FILES: [&str; 5] = [
    "tokens.txt",
    "encoder-epoch-75-avg-11-chunk-16-left-128.int8.onnx",
    "decoder-epoch-75-avg-11-chunk-16-left-128.onnx",
    "joiner-epoch-75-avg-11-chunk-16-left-128.int8.onnx",
    "bpe.model",
];
const SAMPLE_RATE: i32 = 16_000;
/// Keep feeding the recognizer this long after the last speech chunk.
const HANGOVER_SAMPLES: usize = 16_000 * 8 / 10;
/// Zero padding flushes the transducer's right context on forced finalize.
const TAIL_PADDING_SAMPLES: usize = 16_000 * 3 / 10;
/// Client-side STT exposes no per-utterance score; the server still runs text LID.
const DEFAULT_CONFIDENCE: f32 = 0.85;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTranscript {
    pub channel: String,
    pub text: String,
    /// Always "auto": the multilingual model gives no language id, the server detects it from text.
    pub language: String,
    pub is_final: bool,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub file: String,
    pub downloaded: u64,
    pub total: u64,
}

pub fn model_dir(base: &Path) -> PathBuf {
    base.join("models").join("sherpa-zipformer-multilingual")
}

pub fn is_model_ready(dir: &Path) -> bool {
    MODEL_FILES
        .iter()
        .all(|f| fs::metadata(dir.join(f)).map(|m| m.len() > 0).unwrap_or(false))
}

/// Downloads missing model files (resumable at file granularity). `.part` files are
/// only renamed once the byte count matches Content-Length.
pub async fn download_model<F>(dir: &Path, on_progress: F) -> Result<(), String>
where
    F: Fn(DownloadProgress),
{
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let client = reqwest::Client::new();
    for name in MODEL_FILES {
        let target = dir.join(name);
        if fs::metadata(&target).map(|m| m.len() > 0).unwrap_or(false) {
            continue;
        }
        let url = format!("https://huggingface.co/{MODEL_REPO}/resolve/main/{name}");
        let mut resp = client
            .get(&url)
            .send()
            .await
            .and_then(|r| r.error_for_status())
            .map_err(|e| format!("download {name}: {e}"))?;
        let total = resp.content_length().unwrap_or(0);
        let part = dir.join(format!("{name}.part"));
        let mut file = fs::File::create(&part).map_err(|e| e.to_string())?;
        let mut downloaded = 0u64;
        while let Some(chunk) = resp.chunk().await.map_err(|e| format!("download {name}: {e}"))? {
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;
            on_progress(DownloadProgress { file: name.to_string(), downloaded, total });
        }
        drop(file);
        if total > 0 && downloaded != total {
            let _ = fs::remove_file(&part);
            return Err(format!("download {name}: expected {total} bytes, got {downloaded}"));
        }
        fs::rename(&part, &target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn load_recognizer(dir: &Path, num_threads: i32) -> Result<Arc<OnlineRecognizer>, String> {
    if !is_model_ready(dir) {
        return Err("Local STT model is not downloaded".into());
    }
    let path = |f: &str| Some(dir.join(f).to_string_lossy().into_owned());
    let mut config = OnlineRecognizerConfig::default();
    config.model_config.transducer.encoder = path(MODEL_FILES[1]);
    config.model_config.transducer.decoder = path(MODEL_FILES[2]);
    config.model_config.transducer.joiner = path(MODEL_FILES[3]);
    config.model_config.tokens = path(MODEL_FILES[0]);
    config.model_config.bpe_vocab = path(MODEL_FILES[4]);
    config.model_config.modeling_unit = Some("cjkchar".into());
    config.model_config.num_threads = num_threads;
    config.decoding_method = Some("greedy_search".into());
    config.enable_endpoint = true;
    config.rule1_min_trailing_silence = 2.4;
    config.rule2_min_trailing_silence = 1.2;
    config.rule3_min_utterance_length = 20.0;
    OnlineRecognizer::create(&config)
        .map(Arc::new)
        .ok_or_else(|| "Failed to create sherpa-onnx recognizer".to_string())
}

#[derive(Debug, PartialEq, Eq)]
enum GateAction {
    Idle,
    Feed,
    /// Speech ended: flush and emit the final transcript.
    Finalize,
}

/// Decides, per audio chunk, whether to run the recognizer, so silence costs no CPU.
#[derive(Default)]
struct SpeechGate {
    active: bool,
    silence_samples: usize,
}

impl SpeechGate {
    fn update(&mut self, samples: usize, is_speech: bool) -> GateAction {
        if is_speech {
            self.active = true;
            self.silence_samples = 0;
            return GateAction::Feed;
        }
        if !self.active {
            return GateAction::Idle;
        }
        self.silence_samples += samples;
        if self.silence_samples < HANGOVER_SAMPLES {
            GateAction::Feed
        } else {
            self.active = false;
            self.silence_samples = 0;
            GateAction::Finalize
        }
    }
}

struct ChannelState {
    stream: OnlineStream,
    gate: SpeechGate,
    last_text: String,
}

enum Message {
    Audio { channel: String, samples: Vec<f32>, is_speech: bool },
    /// Caller-side VAD saw the speaker stop: finalize the utterance now.
    Flush { channel: String },
    Stop,
}

/// Handle to the recognition worker thread. Dropping it stops the worker.
pub struct LocalStt {
    tx: Sender<Message>,
}

impl LocalStt {
    pub fn start<F>(recognizer: Arc<OnlineRecognizer>, emit: F) -> Self
    where
        F: Fn(LocalTranscript) + Send + 'static,
    {
        let (tx, rx) = channel::<Message>();
        thread::spawn(move || {
            let mut channels: HashMap<String, ChannelState> = HashMap::new();
            while let Ok(msg) = rx.recv() {
                let (channel, samples, is_speech, flush) = match msg {
                    Message::Audio { channel, samples, is_speech } => (channel, samples, is_speech, false),
                    Message::Flush { channel } => (channel, Vec::new(), false, true),
                    Message::Stop => break,
                };
                let state = channels.entry(channel.clone()).or_insert_with(|| ChannelState {
                    stream: recognizer.create_stream(),
                    gate: SpeechGate::default(),
                    last_text: String::new(),
                });
                if flush {
                    if state.gate.active {
                        state.gate = SpeechGate::default();
                        finalize(&recognizer, state, &channel, &emit);
                    }
                    continue;
                }
                process_chunk(&recognizer, state, &channel, &samples, is_speech, &emit);
            }
        });
        Self { tx }
    }

    pub fn flush(&self, channel: &str) {
        let _ = self.tx.send(Message::Flush { channel: channel.to_string() });
    }

    pub fn push(&self, channel: &str, samples: Vec<f32>, is_speech: bool) {
        let _ = self.tx.send(Message::Audio { channel: channel.to_string(), samples, is_speech });
    }
}

impl Drop for LocalStt {
    fn drop(&mut self) {
        let _ = self.tx.send(Message::Stop);
    }
}

fn decode_pending(recognizer: &OnlineRecognizer, stream: &OnlineStream) -> String {
    while recognizer.is_ready(stream) {
        recognizer.decode(stream);
    }
    recognizer
        .get_result(stream)
        .map(|r| r.text.trim().to_string())
        .unwrap_or_default()
}

fn transcript(channel: &str, text: String, is_final: bool) -> LocalTranscript {
    LocalTranscript {
        channel: channel.to_string(),
        text,
        language: "auto".to_string(),
        is_final,
        confidence: DEFAULT_CONFIDENCE,
    }
}

/// Pads, decodes the tail, emits the final transcript and resets the stream.
fn finalize<F: Fn(LocalTranscript)>(
    recognizer: &OnlineRecognizer,
    state: &mut ChannelState,
    channel: &str,
    emit: &F,
) {
    state.stream.accept_waveform(SAMPLE_RATE, &vec![0.0f32; TAIL_PADDING_SAMPLES]);
    let text = decode_pending(recognizer, &state.stream);
    if !text.is_empty() {
        emit(transcript(channel, text, true));
    }
    recognizer.reset(&state.stream);
    state.last_text.clear();
}

fn process_chunk<F: Fn(LocalTranscript)>(
    recognizer: &OnlineRecognizer,
    state: &mut ChannelState,
    channel: &str,
    samples: &[f32],
    is_speech: bool,
    emit: &F,
) {
    match state.gate.update(samples.len(), is_speech) {
        GateAction::Idle => {}
        GateAction::Feed => {
            state.stream.accept_waveform(SAMPLE_RATE, samples);
            let text = decode_pending(recognizer, &state.stream);
            if recognizer.is_endpoint(&state.stream) {
                if !text.is_empty() {
                    emit(transcript(channel, text, true));
                }
                recognizer.reset(&state.stream);
                state.last_text.clear();
                state.gate = SpeechGate::default();
            } else if !text.is_empty() && text != state.last_text {
                state.last_text = text.clone();
                emit(transcript(channel, text, false));
            }
        }
        GateAction::Finalize => finalize(recognizer, state, channel, emit),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gate_ignores_silence_before_speech() {
        let mut gate = SpeechGate::default();
        assert_eq!(gate.update(1600, false), GateAction::Idle);
    }

    #[test]
    fn gate_feeds_during_hangover_then_finalizes_once() {
        let mut gate = SpeechGate::default();
        assert_eq!(gate.update(1600, true), GateAction::Feed);
        assert_eq!(gate.update(1600, false), GateAction::Feed);
        assert_eq!(gate.update(HANGOVER_SAMPLES, false), GateAction::Finalize);
        assert_eq!(gate.update(1600, false), GateAction::Idle);
    }

    #[test]
    fn gate_speech_resets_hangover() {
        let mut gate = SpeechGate::default();
        gate.update(1600, true);
        gate.update(HANGOVER_SAMPLES - 1, false);
        assert_eq!(gate.update(1600, true), GateAction::Feed);
        assert_eq!(gate.update(HANGOVER_SAMPLES - 1, false), GateAction::Feed);
    }

    #[test]
    fn model_not_ready_for_empty_dir() {
        assert!(!is_model_ready(Path::new("definitely/not/a/model/dir")));
    }

    /// Needs network (model download) and the sample PCM files at the repo root:
    /// `cargo test -- --ignored local_stt_transcribes_sample`.
    #[tokio::test]
    #[ignore]
    async fn local_stt_transcribes_sample() {
        let dir = std::env::temp_dir().join("layameet-local-stt-test");
        download_model(&dir, |_| {}).await.expect("download");
        let recognizer = load_recognizer(&dir, 2).expect("load");
        let pcm = std::fs::read(concat!(env!("CARGO_MANIFEST_DIR"), "/../../../vi_sample_16k.pcm")).expect("pcm");
        let samples: Vec<f32> = pcm
            .chunks_exact(2)
            .map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.0)
            .collect();

        let (tx, rx) = std::sync::mpsc::channel();
        let stt = LocalStt::start(recognizer, move |t| {
            let _ = tx.send(t);
        });
        for chunk in samples.chunks(1600) {
            stt.push("mic", chunk.to_vec(), true);
        }
        stt.flush("mic");
        drop(stt);
        let events: Vec<LocalTranscript> = rx.iter().collect();
        let finals: Vec<_> = events.iter().filter(|e| e.is_final).collect();
        println!("partials={} finals={:?}", events.len() - finals.len(), finals);
        assert!(!finals.is_empty(), "expected at least one final transcript");
    }
}
