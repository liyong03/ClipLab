import { useState, useCallback, useRef } from 'react';
import type { FilterSetting } from '../filters/types';
import { getAllFilters, getFilter } from '../filters/registry';

export function useFilterChain() {
  const [filterSettings, setFilterSettings] = useState<FilterSetting[]>(() =>
    getAllFilters()
      .filter((f) => !f.serverSide)
      .map((f) => ({
        filterId: f.id,
        enabled: false,
        params: Object.fromEntries(f.params.map((p) => [p.key, p.default])),
      })),
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const toggleFilter = useCallback((filterId: string) => {
    setFilterSettings((prev) =>
      prev.map((s) => (s.filterId === filterId ? { ...s, enabled: !s.enabled } : s)),
    );
  }, []);

  const updateParam = useCallback((filterId: string, key: string, value: number) => {
    setFilterSettings((prev) =>
      prev.map((s) =>
        s.filterId === filterId
          ? { ...s, params: { ...s.params, [key]: value } }
          : s,
      ),
    );
  }, []);

  const playWithFilters = useCallback(
    async (audioBlob: Blob) => {
      // Stop any existing playback
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      sourceRef.current = source;

      // Build filter chain
      let currentNode: AudioNode = source;
      const enabledFilters = filterSettings.filter((s) => s.enabled);

      for (const setting of enabledFilters) {
        const plugin = getFilter(setting.filterId);
        if (plugin?.createNodes) {
          const nodes = plugin.createNodes(ctx, setting.params);
          for (const node of nodes) {
            currentNode.connect(node);
            currentNode = node;
          }
        }
      }

      currentNode.connect(ctx.destination);
      source.start();

      source.onended = () => {
        sourceRef.current = null;
      };
    },
    [filterSettings],
  );

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
  }, []);

  const renderFilteredAudio = useCallback(
    async (audioBlob: Blob): Promise<Blob> => {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const tempCtx = new AudioContext();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      await tempCtx.close();

      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate,
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;

      let currentNode: AudioNode = source;
      const enabledFilters = filterSettings.filter((s) => s.enabled);

      for (const setting of enabledFilters) {
        const plugin = getFilter(setting.filterId);
        if (plugin?.createNodes) {
          const nodes = plugin.createNodes(offlineCtx as unknown as AudioContext, setting.params);
          for (const node of nodes) {
            currentNode.connect(node);
            currentNode = node;
          }
        }
      }

      currentNode.connect(offlineCtx.destination);
      source.start();

      const renderedBuffer = await offlineCtx.startRendering();

      // Convert AudioBuffer to WAV blob
      const wavBlob = audioBufferToWav(renderedBuffer);
      return wavBlob;
    },
    [filterSettings],
  );

  return {
    filterSettings,
    setFilterSettings,
    toggleFilter,
    updateParam,
    playWithFilters,
    stopPlayback,
    renderFilteredAudio,
  };
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = headerSize;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
