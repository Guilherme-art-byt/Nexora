import { useRouter, type RouteName } from "@/lib/router";
import { isDemo, tmdbEnabled } from "@/services";
import { SourceDownloadButton } from "../SourceDownloadButton";
import { Logo } from "../ui";

const LINKS: { name: RouteName; label: string }[][] = [
  [
    { name: "filmes", label: "Filmes" },
    { name: "series", label: "Séries" },
    { name: "lancamentos", label: "Lançamentos" },
    { name: "em-alta", label: "Em alta" },
  ],
  [
    { name: "categorias", label: "Categorias" },
    { name: "minha-lista", label: "Minha Lista" },
    { name: "buscar", label: "Pesquisar" },
  ],
  [
    { name: "perfil", label: "Minha conta" },
    { name: "perfis", label: "Perfis" },
    { name: "configuracoes", label: "Configurações" },
  ],
];

export function Footer() {
  const { navigate } = useRouter();
  return (
    <footer className="page-x relative z-[2] mt-16 border-t border-line/70 pb-28 pt-12 text-sm text-mute lg:pb-14">
      <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 leading-relaxed">Filmes e séries com a sensação de sala escura, onde quer que você esteja.</p>
          <div className="mt-5">
            <SourceDownloadButton className="btn-glass min-h-[42px] text-sm" />
            <p className="mt-2 text-xs leading-relaxed">Projeto completo em .zip: código, banco de dados, artes, vídeo e instruções.</p>
          </div>
        </div>
        {LINKS.map((col, i) => (
          <ul key={i} className="space-y-2.5">
            {col.map((l) => (
              <li key={l.name}>
                <a href={`#${l.name}`} onClick={(e) => { e.preventDefault(); navigate(l.name); }} className="hover:text-paper">{l.label}</a>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div className="mt-10 space-y-2 border-t border-line/60 pt-6 text-xs leading-relaxed">
        {isDemo && (
          <p>
            <strong className="text-paper/80">Modo demonstração.</strong> Títulos reais com informações de referência; as imagens são ilustrações originais da Lanterna{tmdbEnabled ? " substituídas pelas oficiais do TMDB" : " (os pôsteres oficiais aparecem ao configurar o TMDB)"}. A reprodução usa um vídeo de demonstração. Contas, listas e progresso ficam salvos neste navegador.
          </p>
        )}
        {tmdbEnabled && <p>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>}
        <p>© {new Date().getFullYear()} Lanterna. Todos os vídeos exibidos vêm de fontes autorizadas.</p>
      </div>
    </footer>
  );
}
