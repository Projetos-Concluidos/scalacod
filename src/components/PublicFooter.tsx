import { Link } from "react-router-dom";
import ScalaCODLogo, { ScalaCODBrandName } from "@/components/ScalaCODLogo";

const columns = [
  {
    title: "Produto",
    links: [
      { label: "Funcionalidades", to: "/funcionalidades" },
      { label: "Planos", to: "/planos" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    title: "Acesso",
    links: [
      { label: "Login", to: "/login" },
      { label: "Criar conta", to: "/register" },
    ],
  },
  {
    title: "Suporte",
    links: [
      { label: "Central de Ajuda", to: "/ajuda" },
      { label: "Status", to: "/status" },
      { label: "Termos de Uso", to: "/termos" },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="relative border-t border-white/5 bg-black/80 pt-16 pb-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <ScalaCODLogo size={24} />
              <ScalaCODBrandName className="text-lg font-extrabold" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              Automação COD com checkout híbrido inteligente. Escale suas vendas no piloto automático.
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-gray-500 transition hover:text-emerald-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact row */}
        <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/5 pt-6">
          <span className="text-sm text-gray-500">📧 contato@scalacod.com</span>
          <span className="text-sm text-gray-500">💬 WhatsApp</span>
        </div>

        {/* Bottom */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 md:flex-row">
          <p className="text-xs text-gray-600">© 2026 ScalaCOD. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link to="/termos" className="text-xs text-gray-600 transition hover:text-emerald-400">Termos de Uso</Link>
            <span className="text-xs text-gray-700">•</span>
            <Link to="/termos" className="text-xs text-gray-600 transition hover:text-emerald-400">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
