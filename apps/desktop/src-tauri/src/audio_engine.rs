use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::Stream;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
    pub is_input: bool,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioChunkEvent {
    pub channel_type: String, // "mic" (User) or "loopback" (Zoom/Meet attendee)
    pub samples: Vec<f32>,
    pub rms_energy: f32,
    pub is_speech: bool,
}

enum AudioCommand {
    Start {
        on_chunk: Arc<dyn Fn(AudioChunkEvent) + Send + Sync + 'static>,
    },
    Stop,
}

pub struct AudioEngine {
    is_recording: Arc<AtomicBool>,
    cmd_sender: Mutex<Sender<AudioCommand>>,
}

impl AudioEngine {
    pub fn new() -> Self {
        let (tx, rx) = channel::<AudioCommand>();
        let is_recording = Arc::new(AtomicBool::new(false));
        let is_rec_worker = is_recording.clone();

        // Spawn a dedicated thread owning the audio streams (since cpal::Stream on Windows is !Send)
        thread::spawn(#[allow(unused_variables, unused_assignments)] move || {
            let mut mic_stream: Option<Stream> = None;
            let mut loopback_stream: Option<Stream> = None;

            while let Ok(cmd) = rx.recv() {
                match cmd {
                    AudioCommand::Start { on_chunk } => {
                        let host = cpal::default_host();

                        // 1. Setup Microphone input
                        if let Some(mic_device) = host.default_input_device() {
                            if let Ok(mic_config) = mic_device.default_input_config() {
                                let is_rec = is_rec_worker.clone();
                                let cb = on_chunk.clone();
                                let channels = mic_config.channels() as usize;
                                let sample_rate = mic_config.sample_rate().0;

                                let stream_res = mic_device.build_input_stream(
                                    &mic_config.into(),
                                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                                        if !is_rec.load(Ordering::SeqCst) {
                                            return;
                                        }
                                        let mono = downsample_to_16k_mono(data, channels, sample_rate);
                                        let rms = calculate_rms(&mono);
                                        let is_speech = rms > 0.012; // Energy VAD threshold
                                        cb(AudioChunkEvent {
                                            channel_type: "mic".to_string(),
                                            samples: mono,
                                            rms_energy: rms,
                                            is_speech,
                                        });
                                    },
                                    |err| eprintln!("Microphone stream error: {}", err),
                                    None,
                                );

                                if let Ok(s) = stream_res {
                                    if s.play().is_ok() {
                                        mic_stream = Some(s);
                                    }
                                }
                            }
                        }

                        // 2. Setup System Audio WASAPI Loopback (captures Zoom/Meet output)
                        if let Some(out_device) = host.default_output_device() {
                            if let Ok(out_config) = out_device.default_output_config() {
                                let is_rec = is_rec_worker.clone();
                                let cb = on_chunk.clone();
                                let channels = out_config.channels() as usize;
                                let sample_rate = out_config.sample_rate().0;

                                let stream_res = out_device.build_input_stream(
                                    &out_config.into(),
                                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                                        if !is_rec.load(Ordering::SeqCst) {
                                            return;
                                        }
                                        let mono = downsample_to_16k_mono(data, channels, sample_rate);
                                        let rms = calculate_rms(&mono);
                                        let is_speech = rms > 0.010;
                                        cb(AudioChunkEvent {
                                            channel_type: "loopback".to_string(),
                                            samples: mono,
                                            rms_energy: rms,
                                            is_speech,
                                        });
                                    },
                                    |err| eprintln!("WASAPI Loopback stream error: {}", err),
                                    None,
                                );

                                if let Ok(s) = stream_res {
                                    if s.play().is_ok() {
                                        loopback_stream = Some(s);
                                    }
                                }
                            }
                        }
                    }
                    AudioCommand::Stop => {
                        mic_stream = None;
                        loopback_stream = None;
                    }
                }
            }
        });

        Self {
            is_recording,
            cmd_sender: Mutex::new(tx),
        }
    }

    /// List all audio input microphones and output devices (available for WASAPI loopback)
    pub fn get_devices(&self) -> Vec<AudioDeviceInfo> {
        let mut list = Vec::new();
        let host = cpal::default_host();
        let default_in = host.default_input_device().and_then(|d| d.name().ok());
        let default_out = host.default_output_device().and_then(|d| d.name().ok());

        if let Ok(input_devices) = host.input_devices() {
            for device in input_devices {
                if let Ok(name) = device.name() {
                    let is_default = default_in.as_ref() == Some(&name);
                    list.push(AudioDeviceInfo {
                        id: name.clone(),
                        name,
                        is_input: true,
                        is_default,
                    });
                }
            }
        }

        if let Ok(output_devices) = host.output_devices() {
            for device in output_devices {
                if let Ok(name) = device.name() {
                    let is_default = default_out.as_ref() == Some(&name);
                    list.push(AudioDeviceInfo {
                        id: name.clone(),
                        name: format!("{} (Loa hệ thống / Zoom / Meet)", name),
                        is_input: false,
                        is_default,
                    });
                }
            }
        }

        list
    }

    /// Start capturing both Microphone (Self) and WASAPI Loopback (Other participants)
    pub fn start_capture<F>(&self, on_chunk: F) -> Result<(), String>
    where
        F: Fn(AudioChunkEvent) + Send + Sync + 'static,
    {
        if self.is_recording.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.is_recording.store(true, Ordering::SeqCst);
        let tx = self.cmd_sender.lock().map_err(|e| e.to_string())?;
        tx.send(AudioCommand::Start {
            on_chunk: Arc::new(on_chunk),
        })
        .map_err(|e| e.to_string())
    }

    /// Stop capturing audio
    pub fn stop_capture(&self) {
        self.is_recording.store(false, Ordering::SeqCst);
        if let Ok(tx) = self.cmd_sender.lock() {
            let _ = tx.send(AudioCommand::Stop);
        }
    }
}

/// Downsamples multichannel audio from source_rate to 16,000 Hz Mono Float32
fn downsample_to_16k_mono(input: &[f32], channels: usize, source_rate: u32) -> Vec<f32> {
    if channels == 0 || input.is_empty() {
        return Vec::new();
    }

    // Step 1: Average channels to mono
    let frames = input.len() / channels;
    let mut mono = Vec::with_capacity(frames);
    for i in 0..frames {
        let mut sum = 0.0f32;
        for c in 0..channels {
            sum += input[i * channels + c];
        }
        mono.push(sum / channels as f32);
    }

    // Step 2: Linear resample to 16,000 Hz
    let target_rate = 16000.0f32;
    let ratio = source_rate as f32 / target_rate;
    let target_len = (frames as f32 / ratio).floor() as usize;
    let mut resampled = Vec::with_capacity(target_len);

    for i in 0..target_len {
        let src_idx = (i as f32 * ratio) as usize;
        if src_idx < mono.len() {
            resampled.push(mono[src_idx]);
        }
    }

    resampled
}

/// Calculate Root-Mean-Square (RMS) Energy of audio buffer
fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_sq / samples.len() as f32).sqrt()
}
