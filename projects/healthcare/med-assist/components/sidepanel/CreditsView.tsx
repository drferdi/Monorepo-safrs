import { motion, type Variants } from 'framer-motion';
import React from 'react';

interface CreditsViewProps {
  onBack: () => void;
}

export const CreditsView: React.FC<CreditsViewProps> = ({ onBack }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <div className="credits-view flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#F4EFE6] p-8 text-center relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#10B981] opacity-5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        className="credits-content max-w-sm w-full z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="mb-12" variants={itemVariants}>
          <div className="text-[10px] tracking-[0.4em] uppercase text-[#737373] mb-4">
            System Origin
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#10B981]">SENTRA ASSIST</h1>
          <div className="text-[9px] font-mono tracking-widest text-[#737373] mt-1">
            VER 1.0.1 REV 2026.04
          </div>
        </motion.div>

        <motion.div className="mb-16" variants={itemVariants}>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#737373] mb-3">
            Architect & Visionary
          </div>
          <div className="text-lg font-light tracking-[0.1em] text-[#EDEDED]">Drferdi</div>
          <div className="italic text-[10px] text-[#555555] mt-4 font-serif">
            &quot;Masterplan and masterpiece by Drferdi.&quot;
          </div>
        </motion.div>

        <motion.div className="mb-12 grid grid-cols-2 gap-8" variants={itemVariants}>
          <div className="text-left border-l border-[#ffffff05] pl-4">
            <div className="text-[8px] uppercase tracking-widest text-[#555]">Engine</div>
            <div className="text-[10px] text-[#888] font-mono mt-1">Iskandar v2</div>
          </div>
          <div className="text-left border-l border-[#ffffff05] pl-4">
            <div className="text-[8px] uppercase tracking-widest text-[#555]">Protocol</div>
            <div className="text-[10px] text-[#888] font-mono mt-1">Clinical Aura</div>
          </div>
        </motion.div>

        <motion.button
          variants={itemVariants}
          onClick={onBack}
          className="mt-8 text-[9px] tracking-[0.3em] uppercase text-[#737373] hover:text-[#10B981] transition-colors border-b border-transparent hover:border-[#10B981] pb-1"
        >
          Return to Console
        </motion.button>
      </motion.div>

      {/* Decorative Line */}
      <motion.div
        className="absolute bottom-12 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ffffff05] to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
    </div>
  );
};
