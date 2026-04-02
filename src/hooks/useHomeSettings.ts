import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeSettings {
  navbar: {
    logo_text: string;
    links: string[];
    cta_text: string;
  };
  hero: {
    badge: string;
    title_line1: string;
    title_line2: string;
    highlight_word: string;
    subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    social_proof_text: string;
    social_proof_rating: string;
    screenshot_url: string;
  };
  logos: {
    title: string;
    items: string[];
  };
  features: {
    items: {
      title: string;
      description: string;
      bullets: string[];
      image_url: string;
      image_side: "left" | "right";
      tag?: string;
      highlight?: string;
    }[];
  };
  pricing: {
    title: string;
    subtitle: string;
    cta_text: string;
  };
  testimonials: {
    items: {
      quote: string;
      author: string;
      detail: string;
      highlight?: string;
    }[];
  };
  cta_final: {
    title: string;
    subtitle: string;
    cta_text: string;
    bullets: string[];
  };
  footer: {
    logo_text: string;
    tagline: string;
    copyright: string;
    email: string;
    col1_title: string;
    col1_links: string[];
    col2_title: string;
    col2_links: string[];
  };
  pain_points: {
    section_tag: string;
    section_title: string;
    section_subtitle: string;
    items: {
      emoji: string;
      problem: string;
      pain: string;
      solution: string;
    }[];
  };
  checkout_section: {
    badge: string;
    title: string;
    subtitle: string;
    highlight: string;
    steps: {
      icon: string;
      step: string;
      title: string;
      sub: string;
    }[];
    result_number: string;
    result_title: string;
    result_subtitle: string;
  };
  tools: {
    section_tag: string;
    section_title: string;
    section_subtitle: string;
    items: {
      icon: string;
      name: string;
      description: string;
      badge: string;
    }[];
  };
  faqs: {
    title: string;
    items: {
      q: string;
      a: string;
    }[];
  };
  login_page: {
    title: string;
    subtitle: string;
    phrases: string[];
    image_url: string;
    image_alt: string;
    bottom_text: string;
  };
  register_page: {
    title: string;
    subtitle: string;
    phrases: string[];
    image_url: string;
    image_alt: string;
    benefits: { icon: string; text: string }[];
  };
  seo: {
    meta_title: string;
    meta_description: string;
    og_title: string;
    og_description: string;
    og_image_url: string;
    keywords: string;
  };
  brand: {
    name: string;
    edition_label: string;
    support_email: string;
    support_whatsapp: string;
  };
}

const defaults: HomeSettings = {
  navbar: { logo_text: "ScalaCOD", links: ["Recursos", "Planos", "Login"], cta_text: "Começar grátis →" },
  hero: { badge: "Plataforma COD", title_line1: "mais avançada", title_line2: "do Brasil", highlight_word: "ninja", subtitle: "Venda no COD com automação ninja.", cta_primary: "Começar trial grátis →", cta_secondary: "Ver demonstração ▶", social_proof_text: "Mais de 500 lojistas já usam", social_proof_rating: "4.9/5", screenshot_url: "" },
  logos: { title: "Integra com as melhores plataformas:", items: ["Logzz", "Coinzz", "MercadoPago", "WhatsApp", "Meta", "YCloud", "ElevenLabs", "OpenAI"] },
  features: { items: [
    { tag: "AUTOMAÇÃO DE WHATSAPP", title: "Mensagens certas,\nna hora certa,\nsem você tocar.", description: "Configure uma vez. Funcione para sempre.", bullets: ["Builder visual drag & drop de fluxos", "Vozes clonadas com IA (ElevenLabs)", "Templates prontos para todos os status COD", "Campanhas em massa para sua base"], image_url: "", image_side: "right", highlight: "Seus clientes recebem mensagens enquanto você dorme." },
    { tag: "KANBAN DE PEDIDOS", title: "Todos os seus\npedidos. Um\nlugar. Ao vivo.", description: "Kanban em tempo real sincronizado com a Logzz via webhook.", bullets: ["Realtime — atualiza sem recarregar", "Etiquetas de impressão A4 e térmica", "Histórico completo de status", "Filtros avançados por período, cidade, produto"], image_url: "", image_side: "left", highlight: "Nunca mais perca um pedido de vista." },
    { tag: "PIXEL ANALYTICS", title: "Saiba exatamente\nonde seu dinheiro\nestá indo.", description: "Facebook Pixel + Google Ads + UTM completos.", bullets: ["FB Pixel + Meta CAPI server-side", "Google Ads + Google Analytics", "UTM tracking em todos os pedidos", "Funil de conversão por hora"], image_url: "", image_side: "right", highlight: "Dados reais = decisões certas = mais lucro." },
  ] },
  pricing: { title: "Planos para cada fase do seu negócio", subtitle: "Comece grátis por 7 dias.", cta_text: "Começar trial de 7 dias grátis" },
  testimonials: { items: [
    { quote: "Antes eu perdia 40% dos pedidos por CEP fora da área. Hoje o ScalaCOD manda para Coinzz automaticamente. Meu faturamento subiu 60% no primeiro mês.", author: "Rafael M.", detail: "Afiliado COD · 800 pedidos/mês", highlight: "faturamento subiu 60%" },
    { quote: "O checkout híbrido é genial. Cliente do interior que não tinha Logzz agora compra pelo Correios via Coinzz. Zero pedido perdido por falta de cobertura.", author: "Juliana S.", detail: "Produtora · 2.300 pedidos/mês", highlight: "Zero pedido perdido" },
    { quote: "Os fluxos automáticos de WhatsApp reduziram minha taxa de frustração de 23% para 8%.", author: "Carlos R.", detail: "Afiliado · 1.100 pedidos/mês", highlight: "frustração de 23% para 8%" },
  ] },
  cta_final: { title: "Pronto para escalar suas vendas?", subtitle: "Comece grátis por 7 dias.", cta_text: "Criar conta grátis →", bullets: ["Logzz + Coinzz integrados", "WhatsApp automático", "Checkout híbrido"] },
  footer: { logo_text: "ScalaCOD", tagline: "Automação COD com checkout híbrido Logzz + Coinzz.", copyright: "© 2026 ScalaCOD", email: "suporte@scalacod.com.br", col1_title: "Produto", col1_links: ["Checkout Híbrido", "WhatsApp Auto", "Fluxos COD", "Analytics", "Vozes IA"], col2_title: "Empresa", col2_links: ["Planos", "Suporte", "Blog", "Status", "Termos"] },
  pain_points: {
    section_tag: "A DOR REAL DO COD",
    section_title: "Você perde dinheiro",
    section_subtitle: "todo dia sem perceber.",
    items: [
      { emoji: "😤", problem: "CEP fora da área Logzz?", pain: "Pedido perdido. Cliente sumiu. Você não fatura.", solution: "ScalaCOD roteia automaticamente para Coinzz + Correios. Zero perda." },
      { emoji: "📵", problem: "Cliente não confirma na entrega?", pain: "Frustrado, reagendamento manual, nota fiscal emitida em vão.", solution: "Fluxo automático de WhatsApp confirma antes, durante e depois." },
      { emoji: "🤦", problem: "Gestão no Excel + 3 plataformas?", pain: "Logzz aqui, Coinzz ali, WhatsApp no celular. Caos total.", solution: "Tudo em um painel: kanban, leads, conversas, analytics." },
    ],
  },
  checkout_section: {
    badge: "🇧🇷 EXCLUSIVO NO BRASIL",
    title: "O único checkout que",
    subtitle: "pensa antes de você.",
    highlight: "Automático. Invisível. Perfeito.",
    steps: [
      { icon: "📍", step: "1", title: "Cliente digita CEP", sub: "No checkout público" },
      { icon: "⚡", step: "2", title: "ScalaCOD verifica", sub: "API Logzz em tempo real" },
      { icon: "🚚", step: "3A", title: "Logzz disponível", sub: "COD. Paga na entrega." },
      { icon: "📦", step: "3B", title: "Sem cobertura", sub: "Coinzz Correios. Paga agora." },
    ],
    result_number: "0%",
    result_title: "Taxa de pedidos perdidos por CEP",
    result_subtitle: "O fallback automático garante que SEMPRE tem opção de entrega",
  },
  tools: {
    section_tag: "ECOSSISTEMA COMPLETO",
    section_title: "Uma plataforma.",
    section_subtitle: "Zero limitações.",
    items: [
      { icon: "🛒", name: "Checkout Híbrido", description: "Logzz + Coinzz. CEP inteligente. COD ou Correios automático.", badge: "EXCLUSIVO" },
      { icon: "📱", name: "WhatsApp Cloud", description: "YCloud, Meta ou Evolution API. Mensagens reais, entregadas.", badge: "API OFICIAL" },
      { icon: "🤖", name: "Fluxos com IA", description: "Builder visual. IA gera fluxos completos em segundos.", badge: "IA NATIVO" },
      { icon: "🎤", name: "Vozes IA", description: "Clone sua voz. Áudios personalizados no WhatsApp.", badge: "ELEVENLABS" },
      { icon: "📊", name: "Pixel Analytics", description: "FB + Google + UTM + Conversion API server-side.", badge: "CAPI NATIVO" },
      { icon: "👥", name: "CRM de Leads", description: "Base de clientes, tags, histórico e receita acumulada.", badge: "CRM COD" },
    ],
  },
  faqs: {
    title: "Perguntas sobre o ScalaCOD",
    items: [
      { q: "O que é o checkout híbrido Logzz + Coinzz?", a: "Quando o cliente digita o CEP no checkout, o ScalaCOD verifica automaticamente se a Logzz atende aquela região. Se sim, o pedido é COD. Se não, redireciona para Coinzz + Correios." },
      { q: "Preciso ter conta na Logzz e Coinzz separadamente?", a: "Sim. O ScalaCOD integra com suas contas existentes via tokens de API." },
      { q: "Como funciona a automação de WhatsApp?", a: "Você cria fluxos no builder visual. Quando um pedido muda de status, o WhatsApp dispara automaticamente." },
      { q: "Posso usar para vender como afiliado?", a: "Sim. Importe as ofertas direto da Logzz, crie seu checkout em minutos e comece a vender." },
      { q: "Os 7 dias de trial são realmente grátis?", a: "Sim. Nenhum cartão necessário. Teste todas as funcionalidades." },
    ],
  },
  login_page: {
    title: "Bem-vindo de volta 🥷",
    subtitle: "Entre para acessar seu painel COD",
    phrases: ["Seu COD no piloto automático.", "Logzz + Coinzz. Automático.", "Zero pedido perdido.", "WhatsApp que trabalha por você.", "Checkout que pensa."],
    image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    image_alt: "Dashboard",
    bottom_text: "ScalaCOD — Automação COD",
  },
  register_page: {
    title: "Crie sua conta ninja. 🥷",
    subtitle: "7 dias grátis. Sem cartão de crédito.",
    phrases: ["Comece em 5 minutos.", "COD automático te espera.", "Logzz + Coinzz unificados.", "Zero pedido perdido.", "Escale sem parar."],
    image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    image_alt: "Analytics dashboard",
    benefits: [
      { icon: "⚡", text: "Setup em 5 min" },
      { icon: "🔒", text: "Dados seguros" },
      { icon: "💬", text: "Suporte BR" },
    ],
  },
  seo: {
    meta_title: "ScalaCOD — Seu COD no Piloto Automático",
    meta_description: "Checkout híbrido Logzz + Coinzz. WhatsApp automático. Kanban em tempo real. 7 dias grátis.",
    og_title: "ScalaCOD — Seu COD no Piloto Automático",
    og_description: "Checkout híbrido Logzz + Coinzz. WhatsApp automático. Kanban em tempo real. 7 dias grátis.",
    og_image_url: "",
    keywords: "COD, checkout, Logzz, Coinzz, WhatsApp, automação, afiliado",
  },
  brand: {
    name: "ScalaCOD",
    edition_label: "Obsidian Edition",
    support_email: "suporte@scalacod.com.br",
    support_whatsapp: "",
  },
};

export function useHomeSettings() {
  return useQuery({
    queryKey: ["home-settings"],
    queryFn: async (): Promise<HomeSettings> => {
      const { data, error } = await supabase
        .from("home_settings")
        .select("section_key, content");

      if (error) throw error;

      const settings: any = {};
      // Deep copy defaults
      for (const key of Object.keys(defaults) as (keyof HomeSettings)[]) {
        settings[key] = JSON.parse(JSON.stringify(defaults[key]));
      }
      
      for (const row of data || []) {
        const key = row.section_key as keyof HomeSettings;
        if (key in settings) {
          settings[key] = { ...settings[key], ...(row.content as any) };
        }
      }
      return settings as HomeSettings;
    },
    staleTime: 1000 * 60 * 5,
  });
}
