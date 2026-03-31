import { Mic, Info, Upload, Globe } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";

const packs = [
  { name: "Pack Iniciante", tokens: "5.000", price: "R$ 19,90", popular: false },
  { name: "Pack Essencial", tokens: "10.000", price: "R$ 39,90", popular: false },
  { name: "Pack Profissional", tokens: "50.000", price: "R$ 197,00", popular: true },
  { name: "Pack Enterprise", tokens: "100.000", price: "R$ 397,00", popular: false },
];

const Vozes = () => {
  return (
    <div>
      <PageHeader
        title="Vozes"
        subtitle="Gerencie suas vozes, explore a biblioteca e clone novas vozes"
        actions={
          <button className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Upload className="h-4 w-4" /> Clonar Voz
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <div className="ninja-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo de Tokens</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Info className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-4xl font-bold text-foreground mb-4">0</p>
          <div className="flex items-center gap-8 text-sm text-muted-foreground mb-4">
            <span>Tokens Usados: <strong className="text-foreground">0</strong></span>
            <span>Total Comprado: <strong className="text-foreground">0</strong></span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sua utilização atual é de 0% do limite contratado. Tokens são descontados conforme a geração de áudio por inteligência artificial.
          </p>
        </div>
        <div className="ninja-card">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-success" />
            <h3 className="text-base font-bold text-foreground">Dica de Especialista</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Vozes clonadas com mais de 5 minutos de amostra de áudio tendem a ter uma fidelidade 40% superior. Tente usar áudios sem ruído de fundo.
          </p>
        </div>
      </div>

      {/* Token packs */}
      <h2 className="text-xl font-bold text-foreground mb-4">Comprar Tokens</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {packs.map((pack) => (
          <div key={pack.name} className={`ninja-card relative text-center ${pack.popular ? "border-primary" : ""}`}>
            {pack.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-success px-3 py-0.5 text-[10px] font-bold uppercase text-success-foreground">
                Mais Popular
              </span>
            )}
            <p className="text-xs text-muted-foreground mb-2">{pack.name}</p>
            <p className="text-3xl font-bold text-foreground">{pack.tokens}</p>
            <p className="text-xs font-semibold text-primary mb-1">Tokens</p>
            <p className="text-lg font-bold text-foreground mb-4">{pack.price}</p>
            <button className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
              pack.popular
                ? "gradient-primary text-primary-foreground hover:opacity-90"
                : "border border-border text-foreground hover:bg-muted"
            }`}>
              Comprar
            </button>
          </div>
        ))}
      </div>

      {/* Alert */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
        <Info className="h-5 w-5 text-warning shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Você ainda não tem tokens</p>
          <p className="text-xs text-muted-foreground">Compre um pacote acima para começar a gerar áudios com IA. Cada caractere do texto consome 1 token.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit mb-6">
        <button className="rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground">🎙 Minhas Vozes</button>
        <button className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">🌐 Biblioteca</button>
      </div>

      <EmptyState
        icon={<Mic className="h-12 w-12" />}
        title="Nenhuma voz ainda"
        description="Clone sua primeira voz ou explore a biblioteca e favorite as que mais gostar"
        action={
          <div className="flex items-center gap-3">
            <button className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Upload className="h-4 w-4" /> Clonar Voz
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
              <Globe className="h-4 w-4" /> Explorar Biblioteca
            </button>
          </div>
        }
      />
    </div>
  );
};

export default Vozes;
