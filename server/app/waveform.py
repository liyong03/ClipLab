import io
import json

import librosa
import numpy as np


def generate_peaks(audio_data: bytes, num_peaks: int = 150) -> str:
    """Generate a peaks array from audio data. Returns JSON string."""
    try:
        audio_buf = io.BytesIO(audio_data)
        y, sr = librosa.load(audio_buf, sr=None, mono=True)

        if len(y) == 0:
            return json.dumps([0.0] * num_peaks)

        # Divide audio into num_peaks chunks and take the max absolute amplitude
        chunk_size = max(1, len(y) // num_peaks)
        peaks = []
        for i in range(num_peaks):
            start = i * chunk_size
            end = min(start + chunk_size, len(y))
            if start >= len(y):
                peaks.append(0.0)
            else:
                peaks.append(float(np.max(np.abs(y[start:end]))))

        # Normalize to 0-1
        max_peak = max(peaks) if peaks else 1.0
        if max_peak > 0:
            peaks = [p / max_peak for p in peaks]

        # Round for smaller JSON
        peaks = [round(p, 3) for p in peaks]

        return json.dumps(peaks)
    except Exception:
        return json.dumps([0.0] * num_peaks)
