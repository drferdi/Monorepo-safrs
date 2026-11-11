import { motion } from 'framer-motion';

export default function Scene1() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-8 border border-[var(--color-primary)] rounded-full opacity-20"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -inset-8 border border-[var(--color-primary)] rounded-full opacity-20"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
        />

        <motion.div
          className="text-sm md:text-xl font-mono text-[var(--color-primary)] tracking-[0.3em] uppercase mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          Clinical Decision Support System
        </motion.div>

        <motion.h1
          className="text-6xl md:text-8xl lg:text-9xl font-bold font-display tracking-tight text-white mb-6"
          initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          SIDE<span className="text-[var(--color-primary)]">LAB</span>
        </motion.h1>

        <motion.div
          className="h-[1px] w-0 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent mx-auto mt-8 mb-8"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, delay: 1.5, ease: 'easeInOut' }}
        />

        <motion.p
          className="text-xl md:text-3xl text-[var(--color-text-secondary)] font-body max-w-2xl mx-auto font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
        >
          Kecerdasan klinis di ujung jari dokter Indonesia.
        </motion.p>
      </div>

      {/* Futuristic grid/crosshairs in corners */}
      <motion.div 
        className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-[var(--color-text-muted)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      />
      <motion.div 
        className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-[var(--color-text-muted)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      />
      <motion.div 
        className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-[var(--color-text-muted)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      />
      <motion.div 
        className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-[var(--color-text-muted)]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      />
    </motion.div>
  );
}