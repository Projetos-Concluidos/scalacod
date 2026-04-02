import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, ExternalLink, HelpCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface TutorialStep {
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}

interface TutorialSectionData {
  id: string;
  icon: string;
  label: string;
  title: string;
  steps?: TutorialStep[];
  content?: string;
  link?: string;
  linkLabel?: string;
}

const TUTORIAL_SECTIONS: TutorialSectionData[] = [
  {
    id: "inicio",
    icon: "🚀",
    label: "Primeiros Passos",
    title: "Como começar com o ScalaCOD",
    steps: [
      {
        title: "1. Conecte seu WhatsApp",
        description: "Vá em WhatsApp Cloud e conecte sua instância via YCloud, Meta ou Evolution API.",
        link: "/whatsapp-cloud",
        linkLabel: "Ir para WhatsApp Cloud →",
      },
      {
        title: "2. Configure a Logzz",
        description: "Em Configurações → Integrações, insira seu token da Logzz para habilitar a entrega COD.",
        link: "/configuracoes",
        linkLabel: "Ir para Configurações →",
      },
      {
        title: "3. Crie seu primeiro checkout",
        description: "Vá em Checkouts e crie seu primeiro checkout importando uma oferta da Logzz.",
        link: "/checkouts",
        linkLabel: "Ir para Checkouts →",
      },
      {
        title: "4. Aguarde seu primeiro pedido",
        description: "Compartilhe o link do checkout e acompanhe os pedidos em tempo real no Kanban.",
        link: "/pedidos",
        linkLabel: "Ir para Pedidos →",
      },
    ],
  },
  {
    id: "checkouts",
    icon: "🛒",
    label: "Checkouts",
    title: "Como criar e gerenciar checkouts",
    content: `## O que é um Checkout?
Um checkout é a página onde seu cliente finaliza a compra. O ScalaCOD cria checkouts inteligentes que detectam automaticamente se a Logzz atende o CEP do cliente.

## Criando um Checkout
1. Clique em **+ Novo Checkout**
2. **Passo 1 - Produto:** Busque sua oferta da Logzz no campo de busca
3. **Passo 2 - Configurações:** Ative Order Bump se desejar
4. **Passo 3 - Tracking:** Configure seu Pixel do Facebook (opcional)
5. **Passo 4 - Design:** Personalize as cores e textos

## Como funciona o CEP inteligente?
- Se a Logzz **atende** o CEP → cliente escolhe data de entrega (paga na entrega)
- Se a Logzz **não atende** → cliente paga online (PIX, Cartão ou Boleto) via Correios

## Order Bump
Adicione produtos complementares que o cliente pode adicionar com um clique antes de confirmar o pedido. Aumenta o ticket médio!`,
    link: "/checkouts",
    linkLabel: "Abrir Checkouts →",
  },
  {
    id: "pedidos",
    icon: "📦",
    label: "Pedidos (Kanban)",
    title: "Gerenciando pedidos com o Kanban",
    content: `## O Quadro de Pedidos
O kanban mostra todos os seus pedidos organizados por status. Arraste e solte para mover entre colunas!

## Status dos Pedidos
- 🟡 **Aguardando** — Pedido recém criado
- 🟢 **Confirmado** — Confirmado pelo sistema
- 🔵 **Agendado** — Data de entrega agendada na Logzz
- 🟠 **Em Separação** — Sendo preparado no estoque
- 🟣 **Em Rota** — Saiu para entrega
- ✅ **Entregue** — Entregue com sucesso
- 🔴 **Frustrado** — Tentativa de entrega não realizada
- 🔄 **Reagendar** — Aguardando novo agendamento

## Atualização Automática
Os status são atualizados automaticamente via webhook da Logzz. Você não precisa atualizar manualmente!

## Etiquetas de Impressão
Clique em um pedido → aba Logística → botões "A4" e "Térmica" para imprimir a etiqueta de envio.`,
    link: "/pedidos",
    linkLabel: "Abrir Pedidos →",
  },
  {
    id: "fluxos",
    icon: "🤖",
    label: "Fluxos (Automações)",
    title: "Automações de WhatsApp com Fluxos",
    content: `## O que são Fluxos?
Fluxos são automações que enviam mensagens no WhatsApp automaticamente quando um pedido muda de status.

## Criando um Fluxo
1. Clique em **+ Novo Fluxo** ou use um **Template pronto**
2. Escolha o **Trigger** (quando o fluxo dispara): Pedido Confirmado, Agendado, Saiu para Entrega, Entregue, Frustrado, Cancelado
3. Adicione **Nós** no builder visual:
   - 💬 Mensagem de Texto
   - ⏰ Delay (espera)
   - 🔀 Condição (if/else)
   - 🎤 Áudio (com Voz IA)

## Variáveis Disponíveis
Use {{variavel}} para personalizar mensagens:
- {{cliente_nome}}, {{pedido_numero}}, {{produto_nome}}
- {{data_entrega}}, {{valor_total}}, {{codigo_rastreio}}

## Templates Prontos
Clique em "IA" ou use os templates pré-criados para configurar em segundos!`,
    link: "/fluxos",
    linkLabel: "Abrir Fluxos →",
  },
  {
    id: "whatsapp",
    icon: "💬",
    label: "WhatsApp Cloud",
    title: "Conectando seu WhatsApp",
    content: `## Opções de Conexão

### 🟢 YCloud (Recomendado para API Oficial)
- Crie uma conta em ycloud.com
- Copie sua API Key em Settings → API Keys
- Cole no ScalaCOD em WhatsApp Cloud → YCloud

### 🔵 Meta/Facebook (API Oficial Direta)
- Acesse developers.facebook.com
- Crie um app do tipo Business
- Configure o WhatsApp e copie o Phone Number ID
- Cole o Access Token no ScalaCOD

### 🟡 Evolution API (Sem aprovação Meta)
- Instale o Evolution API em seu servidor
- Cole a URL e API Key no ScalaCOD
- Escaneie o QR Code com seu WhatsApp

## Qual escolher?
- **Maior entregabilidade e menos risco de banimento:** YCloud ou Meta
- **Mais barato e sem aprovação:** Evolution API (risco maior de bloqueio)`,
    link: "/whatsapp-cloud",
    linkLabel: "Configurar WhatsApp →",
  },
  {
    id: "leads",
    icon: "👥",
    label: "Leads",
    title: "Gerenciando seus clientes",
    content: `## O que são Leads?
Leads são os clientes que interagiram com seus checkouts. Cada pedido cria ou atualiza um lead automaticamente.

## Visualizações
- **Tabela:** Visão completa com filtros
- **Grid:** Cards visuais por cliente

## Filtrando Leads
- Todos / Confirmados / Em Aguardo / Cancelados
- Busca por nome, email ou telefone

## Importar Leads
Você pode importar uma lista de clientes via CSV para disparar campanhas para eles.`,
    link: "/leads",
    linkLabel: "Abrir Leads →",
  },
  {
    id: "vozes",
    icon: "🎤",
    label: "Vozes (IA)",
    title: "Áudios com Inteligência Artificial",
    content: `## Como funciona?
O módulo de Vozes usa a tecnologia ElevenLabs para gerar áudios ultra-realistas a partir de texto.

## Tokens
- Cada caractere de texto = 1 token
- Tokens são consumidos ao gerar áudio
- Compre pacotes de tokens no módulo Vozes

## Clonando uma Voz
1. Clique em **+ Clonar Voz**
2. Faça upload de 1 a 30 minutos de áudio
3. Aguarde o processamento (2-5 minutos)
4. Use a voz em seus Fluxos!

## Dica de Qualidade
Áudios de maior duração = clonagem mais fiel. Use gravações em ambiente silencioso.`,
    link: "/vozes",
    linkLabel: "Abrir Vozes →",
  },
  {
    id: "disparos",
    icon: "📢",
    label: "Disparos (Campanhas)",
    title: "Enviando campanhas em massa",
    content: `## O que são Disparos?
Disparos permitem enviar mensagens em massa via WhatsApp para toda sua base de clientes (leads).

## Pré-requisitos
- Ter uma instância WhatsApp conectada (Meta ou YCloud)
- Ter um template de mensagem aprovado pela Meta (API Oficial)

## Criando uma Campanha
1. Clique em **+ Nova Campanha**
2. Selecione o Template aprovado
3. Defina o Público (todos os leads, por status, por tag...)
4. Agende ou dispare imediatamente

## Limites
- Máximo de 500 envios por hora
- Apenas templates aprovados pela Meta (API Oficial)`,
    link: "/disparos",
    linkLabel: "Abrir Disparos →",
  },
  {
    id: "configuracoes",
    icon: "⚙️",
    label: "Configurações",
    title: "Configurando sua loja",
    content: `## Abas disponíveis

### Loja
Configure o nome da sua loja e horário comercial. O horário comercial controla quando os fluxos enviam mensagens.

### Integrações
Configure as APIs necessárias:
- **Logzz:** Para entrega COD (obrigatório para Logzz)
- **Coinzz:** Para entrega pelos Correios (fallback)
- **MercadoPago:** Para receber pagamentos online (Coinzz)

### API
Gere tokens de API para integrar sistemas externos com o ScalaCOD.

### Webhooks
Configure uma URL para receber notificações em tempo real sobre pedidos e pagamentos.

### Notificações
Configure alertas por email para novos pedidos, entregas, etc.`,
    link: "/configuracoes",
    linkLabel: "Abrir Configurações →",
  },
];

function renderMarkdown(md: string) {
  const lines = md.trim().split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(<h4 key={i} className="text-sm font-semibold text-foreground mt-4 mb-1">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h3 key={i} className="text-base font-bold text-foreground mt-5 mb-2">{line.slice(3)}</h3>);
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-1">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-1">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ol>
      );
      continue;
    } else if (line.trim() === "") {
      // skip blank
    } else {
      elements.push(
        <p key={i} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: boldify(line) }} />
      );
    }
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
}

function TutorialSection({ section }: { section: TutorialSectionData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id={section.id} className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.icon}</span>
          <h2 className="text-base font-bold text-card-foreground">{section.title}</h2>
        </div>
        <ChevronDown
          className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          size={20}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {section.steps && (
            <div className="space-y-3">
              {section.steps.map((step, i) => (
                <div key={i} className="flex gap-4 p-4 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1 text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.link && (
                      <Link
                        to={step.link}
                        className="text-sm text-primary hover:text-primary/80 font-medium mt-2 inline-block"
                      >
                        {step.linkLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {section.content && renderMarkdown(section.content)}

          {section.link && (
            <div className="pt-4 border-t border-border">
              <Link
                to={section.link}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
              >
                {section.linkLabel}
                <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const Suporte = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("inicio");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return TUTORIAL_SECTIONS;
    const q = searchQuery.toLowerCase();
    return TUTORIAL_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q) ||
        s.steps?.some((st) => st.title.toLowerCase().includes(q) || st.description.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="py-6">
      <PageHeader title="Central de Suporte 🥷" subtitle="Aprenda a usar todas as funcionalidades do ScalaCOD" />

      <div className="flex gap-6 mt-6">
        {/* Side nav */}
        <aside className="w-56 flex-shrink-0 hidden lg:block">
          <div className="bg-card rounded-xl border border-border p-4 sticky top-20">
            <h3 className="font-semibold text-card-foreground mb-3 text-sm">Tutoriais</h3>
            <nav className="space-y-0.5">
              {TUTORIAL_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>{section.icon}</span>
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-4">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tutorial..."
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm bg-card text-card-foreground placeholder:text-muted-foreground"
            />
          </div>

          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum tutorial encontrado para "{searchQuery}"</p>
          )}

          {filtered.map((section) => (
            <TutorialSection key={section.id} section={section} />
          ))}
        </main>
      </div>
    </div>
  );
};

export default Suporte;
