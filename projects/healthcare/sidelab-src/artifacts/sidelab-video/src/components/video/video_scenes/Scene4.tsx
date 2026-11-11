import { motion } from 'framer-motion';

export default function Scene4() {
  const features = [
    {
      id: "01",
      title: "ICD-10 Mapping",
      desc: "Diagnosis kerja otomatis disesuaikan dengan kode standar ICD-10.",
      color: "var(--color-primary)"
    },
    {
      id: "02",
      title: "Farmakologi Terintegrasi",
      desc: "Database 296 item obat Puskesmas + alert stok kritis.",
      color: "var(--color-warning)"
    },
    {
      id: "03",
      title: "Red Flag Detection",
      desc: "Deteksi instan kondisi mengancam jiwa & kriteria rujuk darurat.",
      color: "var(--color-error)"
    }
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 p-12 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="text-[var(--color-primary)] font-mono text-sm tracking-widest mb-12 uppercase flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="w-8 h-[1px] bg-[var(--color-primary)]" />
        Fitur Inti Sidelab
        <div className="w-8 h-[1px] bg-[var(--color-primary)]" />
      </motion.div>

      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feat, i) => (
          <motion.div
            key={feat.id}
            className="relative bg-[var(--color-bg-card)] border border-[var(--color-text-muted)] border-opacity-20 p-8 rounded-xl overflow-hidden group"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.3, duration: 0.8, type: "spring", bounce: 0.4 }}
          >
            {/* Background glowing gradient on hover/animate */}
            <motion.div 
              className="absolute -inset-20 opacity-20 blur-2xl"
              style={{ background: `radial-gradient(circle, ${feat.color} 0%, transparent 70%)` }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              transition={{ delay: 1.5 + i * 0.3, duration: 1 }}
            />
            
            <div className="relative z-10">
              <motion.div 
                className="font-mono text-4xl font-bold mb-6 opacity-30"
                style={{ color: feat.color }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 0.3 }}
                transition={{ delay: 1.2 + i * 0.3, duration: 0.5 }}
              >
                {feat.id}
              </motion.div>
              
              <h3 className="text-2xl font-display font-bold text-white mb-4 leading-tight">
                {feat.title}
              </h3>
              
              <p className="text-[var(--color-text-secondary)] font-body font-light leading-relaxed">
                {feat.desc}
              </p>
            </div>
            
            {/* Animated bottom border */}
            <motion.div 
              className="absolute bottom-0 left-0 h-1"
              style={{ backgroundColor: feat.color }}
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 2 + i * 0.3, duration: 1, ease: "circOut" }}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Decorative lines connecting the cards */}
      <motion.div 
        className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--color-text-muted)] opacity-20 -z-10"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 1.5 }}
      />
    </motion.div>
  );
}