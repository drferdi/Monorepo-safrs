import { motion } from 'framer-motion';

export default function Scene5() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 text-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10">
        <motion.div
          className="text-sm md:text-xl font-mono text-[var(--color-primary)] tracking-[0.3em] uppercase mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          CDSS FKTP
        </motion.div>

        <motion.h1
          className="text-6xl md:text-8xl lg:text-9xl font-bold font-display tracking-tight text-white mb-6"
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
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
          className="text-2xl md:text-4xl text-white font-body font-medium max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.2 }}
        >
          Kecerdasan klinis di ujung jari dokter Indonesia.
        </motion.p>
        
        <motion.div
          className="mt-16 flex items-center justify-center gap-4 text-[var(--color-text-secondary)] font-mono text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3 }}
        >
          <span className="opacity-50">CREATED BY</span>
          <span className="text-white font-bold tracking-wider">dr. Ferdi Iskandar</span>
        </motion.div>
      </div>

      {/* Futuristic expanding rings */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-[var(--color-primary)] opacity-10"
            initial={{ width: 0, height: 0 }}
            animate={{ width: `${ring * 40}vw`, height: `${ring * 40}vw` }}
            transition={{ 
              duration: 3, 
              delay: 1.5 + (ring * 0.2), 
              ease: "circOut" 
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}