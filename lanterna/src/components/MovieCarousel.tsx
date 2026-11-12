import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Title } from "@/types";
import { MovieCard } from "./MovieCard";
import { SectionTitle } from "./ui";

interface Props {
  title: string;
  items: Title[];
  ranked?: boolean;
  action?: ReactNode;
  /** largura de cada item (classes tailwind) */
  itemClass?: string;
  renderItem?: (t: Title, i: number) => ReactNode;
  id?: string;
}

export const POSTER_W = "w-[38vw] xs:w-[30vw] sm:w-[24vw] md:w-[18vw] lg:w-[14.5vw] xl:w-[12.4vw]";

export function MovieCarousel({ title, items, ranked, action, itemClass = POSTER_W, renderItem, id }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    const ro = new ResizeObserver(update);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [update, items.length]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="relative mb-9 sm:mb-11" aria-label={title} id={id}>
      <SectionTitle action={action}>{title}</SectionTitle>
      <div className="group/row relative">
        <div
          ref={scroller}
          onScroll={update}
          className="no-scrollbar page-x flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:scroll-px-6 lg:scroll-px-12"
          role="list"
        >
          {items.map((t, i) => (
            <div key={t.id} role="listitem" className={`${itemClass} shrink-0 snap-start`}>
              {renderItem ? renderItem(t, i) : <MovieCard title={t} rank={ranked ? i + 1 : undefined} />}
            </div>
          ))}
          <div className="w-1 shrink-0" aria-hidden />
        </div>
        <Arrow side="left" hidden={edges.start} onClick={() => page(-1)} />
        <Arrow side="right" hidden={edges.end} onClick={() => page(1)} />
      </div>
    </section>
  );
}

function Arrow({ side, hidden, onClick }: { side: "left" | "right"; hidden: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label={side === "left" ? "Ver anteriores" : "Ver próximos"}
      className={`absolute top-0 z-10 hidden h-[calc(100%-2.6rem)] w-12 items-center justify-center text-paper transition-opacity duration-200 md:flex lg:w-12 ${
        side === "left" ? "left-0 bg-gradient-to-r" : "right-0 bg-gradient-to-l"
      } from-ink via-ink/70 to-transparent ${hidden ? "pointer-events-none opacity-0" : "opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-paper/20 bg-ink/60 backdrop-blur transition hover:scale-110 hover:border-lamp hover:text-lamp">
        {side === "left" ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
      </span>
    </button>
  );
}
