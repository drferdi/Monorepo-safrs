import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function Scene3() {
  const [typedText, setTypedText] = useState('');
  const [phase, setPhase] = useState(0);

  const lines = [
    { text: "> Input: Pasien demam 3 hari, nyeri sendi, ruam...", delay: 500, type: 'user' },
    { text: "> Sidelab Engine: Memproses context...", delay: 1500, type: 'system' },
    { text: "  [||||||||||||||||||||] 100%", delay: 2000, type: 'system' },
    { text: "> Hasil Analisis:", delay: 2500, type: 'success' },
    { text: "  - Suspect: Dengue Haemorrhagic Fever (A91)", delay: 3000, type: 'data' },
    { text: "  - Tatalaksana: IV Fluid Resuscitation, Paracetamol", delay: 3500, type: 'data' },
    { text: "  - Kriteria Rujuk: Trombosit < 100.000 / warning signs", delay: 4000, type: 'warning' },
  ];

  useEffect(() => {
    let currentLine = 0;
    
    const runSequence = async () => {
      for (const line of lines) {
        await new Promise(r => setTimeout(r, line.delay - (currentLine > 0 ? lines[currentLine-1].delay : 0)));
        setPhase(prev => prev + 1);
        currentLine++;
      }
    };
    
    runSequence();
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-10 p-12 overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-5 gap-12 items-center">
        
        {/* Left: Copy */}
        <div className="md:col-span-2 flex flex-col justify-center">
          <motion.div
            className="text-[var(--color-primary)] font-mono text-sm tracking-widest mb-6 uppercase flex items-center gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)] animate-pulse" />
            FastAPI + GPT Engine
          </motion.div>

          <motion.h2
            className="text-5xl lg:text-6xl font-display font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            Solusi Real-Time <span className="text-[var(--color-primary)]">Analisis AI.</span>
          </motion.h2>

          <motion.p
            className="text-xl text-[var(--color-text-secondary)] font-body font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            Streaming Server-Sent Events (SSE) memberikan respons instan seperti asisten konsultan klinis pribadi.
          </motion.p>
        </div>

        {/* Right: Terminal UI */}
        <motion.div 
          className="md:col-span-3 bg-[#0d0d0c] border border-[var(--color-text-muted)] border-opacity-30 rounded-xl overflow-hidden shadow-2xl shadow-[var(--color-primary)]/10"
          initial={{ opacity: 0, x: 50, rotateY: 10 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
          style={{ perspective: 1000 }}
        >
          {/* Terminal Header */}
          <div className="bg-[#1c1c1a] border-b border-[var(--color-text-muted)] border-opacity-30 px-4 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-4 text-xs font-mono text-[var(--color-text-muted)]">sidelab-engine.py</div>
          </div>
          
          {/* Terminal Body */}
          <div className="p-6 font-mono text-sm md:text-base leading-relaxed h-[400px] overflow-hidden relative">
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={phase > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className={`mb-3 ${
                  line.type === 'user' ? 'text-white' :
                  line.type === 'system' ? 'text-[var(--color-text-secondary)]' :
                  line.type === 'success' ? 'text-[var(--color-primary)] font-bold mt-6' :
                  line.type === 'warning' ? 'text-[var(--color-warning)]' :
                  'text-[var(--color-text-primary)]'
                }`}
              >
                {line.text}
              </motion.div>
            ))}
            
            <motion.div 
              className="w-3 h-5 bg-[var(--color-primary)] mt-2"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />

            {/* Matrix rain overlay very subtle */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0d0c] pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}