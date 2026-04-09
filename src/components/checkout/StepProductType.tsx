import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShoppingCart, BookOpen, FileText, Wrench } from "lucide-react";

const productTypes = [
  { value: "dropshipping", label: "Dropshipping", icon: ShoppingCart, desc: "Produto físico com envio e frete", color: "text-primary" },
  { value: "curso", label: "Curso", icon: BookOpen, desc: "Curso online com link de acesso", color: "text-emerald-500" },
  { value: "info_produto", label: "Info Produto", icon: FileText, desc: "E-book, template, planilha", color: "text-orange-500" },
  { value: "servico", label: "Serviço", icon: Wrench, desc: "Consultoria, mentoria, freelance", color: "text-violet-500" },
];

interface Props {
  productType: string;
  setProductType: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  productCoverUrl: string;
  setProductCoverUrl: (v: string) => void;
}

export default function StepProductType({ productType, setProductType, formName, setFormName, productCoverUrl, setProductCoverUrl }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold mb-3 block">Tipo do Produto</Label>
        <div className="grid grid-cols-2 gap-3">
          {productTypes.map((t) => {
            const Icon = t.icon;
            const selected = productType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setProductType(t.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-secondary/30 hover:border-primary/30 hover:bg-secondary/60"
                }`}
              >
                <Icon className={`h-6 w-6 ${selected ? t.color : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Nome do Checkout</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Checkout Curso de Marketing" className="bg-input border-border mt-1" />
      </div>

      <div>
        <Label>Imagem de Capa do Produto (URL)</Label>
        <Input value={productCoverUrl} onChange={(e) => setProductCoverUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="bg-input border-border mt-1" />
        <p className="text-xs text-muted-foreground mt-1">Será exibida como hero no checkout público</p>
        {productCoverUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-border">
            <img src={productCoverUrl} alt="Preview" className="w-full h-32 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>
        )}
      </div>
    </div>
  );
}
