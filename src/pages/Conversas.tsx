import { MessageSquare, Search, SlidersHorizontal, RefreshCw, Tag } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NinjaBadge from "@/components/NinjaBadge";

const Conversas = () => {
  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Left panel */}
      <div className="w-[400px] border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground">Conversas</h2>
            <div className="flex items-center gap-2">
              <NinjaBadge variant="info">Teste</NinjaBadge>
              <button className="text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar contato..."
                className="h-9 w-full rounded-lg border border-border bg-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
          <button className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Tag className="h-3 w-3" /> Criar etiquetas rápidas
          </button>
        </div>

        {/* Empty conversations list */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Nenhuma conversa</p>
          <p className="text-xs text-muted-foreground">Conversas aparecerão com interações</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-muted/30 p-6 mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Selecione uma conversa</h3>
        <p className="text-sm text-muted-foreground">Escolha um contato para visualizar mensagens</p>
      </div>
    </div>
  );
};

export default Conversas;
