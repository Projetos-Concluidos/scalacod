import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import ScalaCODLogo, { ScalaCODBrandName } from "@/components/ScalaCODLogo";

export default function PublicNavbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { label: "Recursos", to: "/funcionalidades" },
    { label: "Planos", to: "/planos" },
    { label: "FAQ", to: "/faq" },
    { label: "Status", to: "/status" },
  ];

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-emerald-900/30 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <ScalaCODLogo size={28} />
          <ScalaCODBrandName className="text-xl font-extrabold tracking-tight" />
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-gray-400 transition hover:text-emerald-400">
              {l.label}
            </Link>
          ))}
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 animate-pulse">
            ⚡ Checkout COD híbrido
          </span>
          <Link to="/login" className="text-sm font-medium text-gray-300 transition hover:text-white">Login</Link>
          <button onClick={() => navigate("/register")} className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black transition hover:bg-emerald-400">
            Começar grátis
          </button>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white md:hidden">
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-gray-950 px-4 pb-4 md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="block py-2 text-sm text-gray-400" onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link to="/login" className="block py-2 text-sm text-gray-400" onClick={() => setMenuOpen(false)}>Login</Link>
          <button onClick={() => { navigate("/register"); setMenuOpen(false); }} className="mt-2 w-full rounded-full bg-emerald-500 px-6 py-2 text-sm font-bold text-black">
            Começar grátis
          </button>
        </div>
      )}
    </nav>
  );
}
