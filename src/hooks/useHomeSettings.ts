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
}

const defaults: HomeSettings = {
  navbar: { logo_text: "ScalaNinja", links: ["Recursos", "Planos", "Login"], cta_text: "Começar grátis →" },
  hero: { badge: "Plataforma COD", title_line1: "mais avançada", title_line2: "do Brasil", highlight_word: "ninja", subtitle: "Venda no COD com automação ninja.", cta_primary: "Começar trial grátis →", cta_secondary: "Ver demonstração ▶", social_proof_text: "Mais de 500 lojistas já usam", social_proof_rating: "4.9/5", screenshot_url: "" },
  logos: { title: "Integra com as melhores plataformas:", items: ["Logzz", "MercadoPago", "WhatsApp", "Meta", "ElevenLabs"] },
  features: { items: [] },
  pricing: { title: "Planos para cada fase do seu negócio", subtitle: "Comece grátis por 7 dias.", cta_text: "Começar trial de 7 dias grátis" },
  testimonials: { items: [] },
  cta_final: { title: "Pronto para escalar suas vendas?", subtitle: "Comece grátis por 7 dias.", cta_text: "Criar conta grátis →", bullets: [] },
  footer: { logo_text: "ScalaNinja", tagline: "Automação COD", copyright: "© 2026 ScalaNinja", email: "contato@scalaninja.com", col1_title: "Produto", col1_links: [], col2_title: "Suporte", col2_links: [] },
};

export function useHomeSettings() {
  return useQuery({
    queryKey: ["home-settings"],
    queryFn: async (): Promise<HomeSettings> => {
      const { data, error } = await supabase
        .from("home_settings")
        .select("section_key, content");

      if (error) throw error;

      const settings = { ...defaults };
      for (const row of data || []) {
        const key = row.section_key as keyof HomeSettings;
        if (key in settings) {
          settings[key] = { ...settings[key], ...(row.content as any) };
        }
      }
      return settings;
    },
    staleTime: 1000 * 60 * 5,
  });
}
