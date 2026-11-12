import { Bookmark, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useContinueWatching } from "@/components/ContinueWatching";
import { TitleGrid } from "@/components/TitleGrid";
import { EmptyState, GridSkeleton, PageHeader } from "@/components/ui";
import { useDocumentTitle } from "@/hooks";
import { useRouter } from "@/lib/router";
import { isDemo } from "@/services";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Title } from "@/types";

type Order = "added" | "az" | "year";

export default function MyList() {
  useDocumentTitle("Minha Lista");
  const { library, getTitle, catalogStatus, isGuest, clearList, profile } = useApp();
  const { navigate } = useRouter();
  const { confirm } = useUI();
  const [order, setOrder] = useState<Order>("added");
  const [kind, setKind] = useState<"all" | "movie" | "series">("all");
  const cw = useContinueWatching();
  const progress = useMemo(() => new Map(cw.map(({ p, t }) => [t.id, p.position / Math.max(1, p.duration)])), [cw]);

  const items = useMemo(() => {
    let list = library.myList.map((id) => getTitle(id)).filter((t): t is Title => !!t);
    if (profile.kids) list = list.filter((t) => ["L", "10", "12"].includes(t.rating));
    if (kind !== "all") list = list.filter((t) => t.kind === kind);
    if (order === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    if (order === "year") list = [...list].sort((a, b) => b.year - a.year);
    return list;
  }, [library.myList, getTitle, kind, order, profile.kids]);

  const clearAll = async () => {
    if (await confirm({ title: "Esvaziar a Minha Lista?", body: `${library.myList.length} títulos serão removidos deste perfil. Esta ação não pode ser desfeita.`, confirmLabel: "Esvaziar lista", danger: true })) {
      await clearList();
    }
  };

  return (
    <>
      <PageHeader
        title="Minha Lista"
        description={isGuest
          ? `Salva neste aparelho. Entre na sua conta para sincronizar entre dispositivos.`
          : `Os títulos que ${profile.name} guardou para ver depois${isDemo ? ", salvos neste navegador" : ", sincronizados com a sua conta"}.`}
      >
        {isGuest && <button className="btn-primary mt-5" onClick={() => navigate("entrar")}>Entrar para sincronizar</button>}
      </PageHeader>

      {catalogStatus === "loading" ? <GridSkeleton /> : library.myList.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={28} />}
          title="Sua lista está vazia"
          body="Toque no + em qualquer filme ou série para guardar aqui e assistir quando quiser."
          action={<button className="btn-primary" onClick={() => navigate("categorias")}>Explorar o catálogo</button>}
        />
      ) : (
        <>
          <div className="page-x mb-6 flex flex-wrap items-center gap-2">
            {([["all", "Tudo"], ["movie", "Filmes"], ["series", "Séries"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`chip ${kind === k ? "chip-on" : ""}`}>{l}</button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-mute">
              Ordenar
              <select className="field !w-auto !py-2" value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                <option value="added">Adicionados recentemente</option>
                <option value="az">Ordem alfabética</option>
                <option value="year">Ano de lançamento</option>
              </select>
            </label>
            <button className="chip hover:!border-ember hover:!text-ember" onClick={clearAll}><Trash2 size={15} /> Esvaziar</button>
          </div>
          {items.length ? <TitleGrid items={items} progress={progress} /> : <p className="page-x text-mute">Nenhum título deste tipo na sua lista.</p>}
        </>
      )}
    </>
  );
}
