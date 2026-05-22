import AIVision from "./AIVision";
import AIAnalysisView from "./AIAnalysisView";
import { motion } from "motion/react";

export default function AIDualView() {
  return (
    <div className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth space-y-6 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="snap-start"
      >
        <div className="min-h-[60vh]">
          <AIVision />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="snap-start"
      >
        <div className="min-h-[60vh]">
          <AIAnalysisView />
        </div>
      </motion.div>
    </div>
  );
}
