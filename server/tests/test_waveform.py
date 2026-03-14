import json
import struct
import wave
import io

import pytest
import numpy as np

from app.waveform import generate_peaks


def _make_wav(samples: list[float], sample_rate: int = 44100) -> bytes:
    """Create a WAV file from float samples (-1.0 to 1.0)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            val = int(clamped * 32767)
            w.writeframes(struct.pack("<h", val))
    return buf.getvalue()


def test_peaks_length():
    audio = _make_wav([0.5] * 44100)  # 1 second of audio
    peaks_json = generate_peaks(audio, num_peaks=100)
    peaks = json.loads(peaks_json)
    assert len(peaks) == 100


def test_peaks_range():
    audio = _make_wav([0.5, -0.5, 0.3, -0.8] * 11025)
    peaks_json = generate_peaks(audio, num_peaks=50)
    peaks = json.loads(peaks_json)
    for p in peaks:
        assert 0.0 <= p <= 1.0


def test_silent_audio():
    audio = _make_wav([0.0] * 44100)
    peaks_json = generate_peaks(audio, num_peaks=50)
    peaks = json.loads(peaks_json)
    assert all(p == 0.0 for p in peaks)


def test_loud_audio_has_high_peaks():
    audio = _make_wav([0.9, -0.9] * 22050)
    peaks_json = generate_peaks(audio, num_peaks=50)
    peaks = json.loads(peaks_json)
    # Most peaks should be near 1.0 after normalization
    high_peaks = [p for p in peaks if p > 0.8]
    assert len(high_peaks) > len(peaks) * 0.5


def test_invalid_audio_returns_zeros():
    peaks_json = generate_peaks(b"not-audio-data", num_peaks=50)
    peaks = json.loads(peaks_json)
    assert len(peaks) == 50
    assert all(p == 0.0 for p in peaks)
