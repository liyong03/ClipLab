interface AudioPreviewProps {
  audioBlob: Blob | null;
  onPlay: (blob: Blob) => void;
  onStop: () => void;
}

export function AudioPreview({ audioBlob, onPlay, onStop }: AudioPreviewProps) {
  if (!audioBlob) return null;

  return (
    <div>
      <button onClick={() => onPlay(audioBlob)}>Preview with Filters</button>
      <button onClick={onStop}>Stop</button>
    </div>
  );
}
