import { motion, useReducedMotion } from "framer-motion";
import type { Title } from "@/types";
import { MovieCard } from "./MovieCard";

export function TitleGrid({ items, ranked, progress }: { items: Title[]; ranked?: boolean; progress?: Map<string, number> }) {
  const reduce = useReducedMotion();
  return (
    <ul className="page-x grid grid-cols-2 gap-x-3 gap-y-6 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((t, i) => (
        <motion.li
          key={t.id}
          layout={!reduce}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.02 }}
        >
          <MovieCard title={t} rank={ranked && i < 10 ? i + 1 : undefined} progress={progress?.get(t.id)} />
        </motion.li>
      ))}
    </ul>
  );
}
