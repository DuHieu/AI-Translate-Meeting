use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, Stream, StreamConfig};
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

pub struct AudioEngine {
    host: Host,
    is_recording: Arc<AtomicBool>,
    mic_stream: Arc<Mutex<Option<Stream>>>,
    loopback_stream: Arc<Mutex<Option<Stream>>>,
}

impl AudioEngine {
    pub fn new() -> Self {
        let host = cpal::default_host();
        Self {
            host,
            is_recording: Arc::new(AtomicBool::new(false)),
            mic_stream: Arc::new(Mutex::new(None)),
            loopback_stream: Arc::new(Mutex::new(None)),
        }
    }

    /// List all audio input microphones and output devices (available for WASAPI loopback)
    pub fn get_devices(&self) -> Vec<AudioDeviceInfo> {
        let mut list = Vec::new();
        let default_in = self.host.default_input_device().and_then(|d| d.name().ok());
        let default_out = self.host.default_output_device().and_then(|d| d.name().ok());

        if let Ok(input_devices) = self.host.input_devices() {
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

        if let Ok(output_devices) = self.host.output_devices() {
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

        let on_chunk = Arc::new(on_chunk);
        self.is_recording.store(true, Ordering::SeqCst);

        // 1. Setup Microphone input
        if let Some(mic_device) = self.host.default_input_device() {
            if let Ok(mic_config) = mic_device.default_input_config() {
                let is_rec = self.is_recording.clone();
                let cb = on_chunk.clone();
                let channels = mic_config.channels() as usize;
                let sample_rate = mic_config.sample_rate().0;

                let stream = mic_device
                    .build_input_stream(
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
                    )
                    .map_err(|e| format!("Failed to build mic stream: {}", e))?;

                stream.play().map_err(|e| format!("Failed to play mic stream: {}", e))?;
                *self.mic_stream.lock().unwrap() = Some(stream);
            }
        }

        // 2. Setup System Audio WASAPI Loopback (captures Zoom/Meet output)
        if let Some(out_device) = self.host.default_output_device() {
            if let Ok(out_config) = out_device.default_output_config() {
                let is_rec = self.is_recording.clone();
                let cb = on_chunk.clone();
                let channels = out_config.channels() as usize;
                let sample_rate = out_config.sample_rate().0;

                // On Windows WASAPI, building an input stream on an output device activates WASAPI loopback
                let stream = out_device
                    .build_input_stream(
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
                    )
                    .map_err(|e| format!("Failed to build loopback stream: {}", e))?;

                stream.play().map_err(|e| format!("Failed to play loopback stream: {}", e))?;
                *self.loopback_stream.lock().unwrap() = Some(stream);
            }
        }

        Ok(())
    }

    /// Stop capturing audio
    pub fn stop_capture(&self) {
        self.is_recording.store(false, Ordering::SeqCst);
        *self.mic_stream.lock().unwrap() = None;
        *self.loopback_stream.lock().unwrap() = None;
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
