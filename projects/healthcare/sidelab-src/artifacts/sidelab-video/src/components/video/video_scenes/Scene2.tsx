import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene2() {
  const [typedText, setTypedText] = useState('');
  const targetText = 'STATUS: OVERLOAD\nPASIEN: 120/HARI\nWAKTU/PASIEN: < 4 MENIT\nRISIKO ERROR: TINGGI';

  useEffect(() => {
    let currentText = '';
    const interval = setInterval(() => {
      if (currentText.length < targetText.length) {
        currentText += targetText[currentText.length];
        setTypedText(currentText);
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10 p-12 overflow-hidden"
      initial={{ opacity: 0, x: '100vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-100vw', filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full max-w-7xl grid grid-cols-2 gap-12 items-center">
        {/* Left Column: Data/Problem */}
        <div className="flex flex-col justify-center h-full">
          <motion.div
            className="text-[var(--color-error)] font-mono text-sm tracking-widest mb-6 uppercase flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-error)] animate-pulse" />
            Sistem Peringatan FKTP
          </motion.div>

          <motion.h2
            className="text-5xl lg:text-7xl font-display font-bold text-white mb-8 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            Beban dokter Puskesmas <span className="text-[var(--color-text-muted)] line-through decoration-[var(--color-error)] decoration-4">tidak ideal.</span>
          </motion.h2>

          <motion.div
            className="bg-[var(--color-bg-card)] border border-[var(--color-error)] border-opacity-30 p-6 rounded-lg font-mono text-xl md:text-2xl text-[var(--color-error)] whitespace-pre-wrap relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            {/* Scanline effect */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(239,68,68,0.1)] to-transparent h-10 w-full"
              animate={{ top: ['-10%', '110%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            />
            {typedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            >
              _
            </motion.span>
          </motion.div>
        </div>

        {/* Right Column: Visual metaphor of chaos/data stream */}
        <div className="relative h-[600px] hidden md:block">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-[var(--color-bg-card)] border border-[var(--color-text-muted)] border-opacity-20 p-4 rounded text-xs font-mono text-[var(--color-text-secondary)]"
              initial={{ 
                opacity: 0, 
                y: Math.random() * 400 + 100, 
                x: Math.random() * 400,
                scale: 0.8
              }}
              animate={{ 
                opacity: [0, 0.5, 0], 
                y: [Math.random() * 400 + 100, Math.random() * 100 - 100],
              }}
              transition={{ 
                duration: Math.random() * 3 + 2, 
                repeat: Infinity, 
                delay: Math.random() * 2,
                ease: 'linear'
              }}
              style={{ width: '200px' }}
            >
              Patient ID: {Math.floor(Math.random() * 9000) + 1000}<br/>
              Symp: {['Demam', 'Batuk', 'Pusing', 'Nyeri'][Math.floor(Math.random() * 4)]}<br/>
              Time: 00:{Math.floor(Math.random() * 59).toString().padStart(2, '0')}
            </motion.div>
          ))}
          
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
          >
             <div className="w-[400px] h-[400px] border border-[var(--color-error)] rounded-full opacity-20 relative flex items-center justify-center">
                 <motion.div 
                    className="w-full h-[2px] bg-[var(--color-error)] absolute"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                 />
                 <div className="bg-[var(--color-bg-dark)] px-4 text-[var(--color-error)] font-mono font-bold text-2xl z-10">BUTUH KEPUTUSAN CEPAT</div>
             </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}