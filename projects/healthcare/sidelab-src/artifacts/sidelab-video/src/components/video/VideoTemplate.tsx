import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import Scene1 from './video_scenes/Scene1';
import Scene2 from './video_scenes/Scene2';
import Scene3 from './video_scenes/Scene3';
import Scene4 from './video_scenes/Scene4';
import Scene5 from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  scene1: 6000,
  scene2: 6000,
  scene3: 6000,
  scene4: 6500,
  scene5: 6500,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* PERSISTENT BACKGROUND LAYERS */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      
      {/* Animated Glowing Orbs */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,255,102,0.15) 0%, rgba(0,0,0,0) 70%)' }}
        animate={{
          x: currentScene === 0 ? '5vw' : currentScene === 1 ? '-20vw' : currentScene === 2 ? '50vw' : currentScene === 3 ? '10vw' : '30vw',
          y: currentScene === 0 ? '5vh' : currentScene === 1 ? '50vh' : currentScene === 2 ? '-10vh' : currentScene === 3 ? '60vh' : '20vh',
          scale: currentScene === 2 ? 1.5 : 1,
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute w-[50vw] h-[50vw] rounded-full blur-[150px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,204,85,0.1) 0%, rgba(0,0,0,0) 70%)' }}
        animate={{
          x: currentScene === 0 ? '60vw' : currentScene === 1 ? '80vw' : currentScene === 2 ? '10vw' : currentScene === 3 ? '70vw' : '20vw',
          y: currentScene === 0 ? '50vh' : currentScene === 1 ? '10vh' : currentScene === 2 ? '60vh' : currentScene === 3 ? '-20vh' : '40vh',
          scale: currentScene === 4 ? 2 : 1,
        }}
        transition={{ duration: 2.5, ease: "easeInOut" }}
      />

      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1 key="scene1" />}
        {currentScene === 1 && <Scene2 key="scene2" />}
        {currentScene === 2 && <Scene3 key="scene3" />}
        {currentScene === 3 && <Scene4 key="scene4" />}
        {currentScene === 4 && <Scene5 key="scene5" />}
      </AnimatePresence>
    </div>
  );
}