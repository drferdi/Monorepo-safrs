import { useState, useCallback } from 'react';
import VideoTemplate from '@/components/video/VideoTemplate';
import { ExportButton } from '@/components/ExportButton';

export default function App() {
  const [resetKey, setResetKey] = useState(0);

  const handleRestartVideo = useCallback(() => {
    setResetKey(k => k + 1);
  }, []);

  return (
    <>
      <VideoTemplate key={resetKey} />
      <ExportButton onRestartVideo={handleRestartVideo} />
    </>
  );
}
