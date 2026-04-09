import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ShoppingBag, Search } from "lucide-react";
import { useState } from "react";

interface BumpItem {
  name: string;
  price: number;
  label_bump: string;
  description: string;
  image_url: string;
}

interface Props {
  orderBumpEnabled: boolean;
  setOrderBumpEnabled: (v: boolean) => void;
  upsellEnabled: boolean;
  setUpsellEnabled: (v: boolean) => void;
  bumps: BumpItem[];
  setBumps: (v: BumpItem[]) => void;
}

export default function StepOrderBumpGeneral({
  orderBumpEnabled, setOrderBumpEnabled,
  upsellEnabled, setUpsellEnabled,
  bumps, setBumps,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLabel, setNewLabel] = useState("OFERTA ESPECIAL");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");

  function addBump() {
    if (!newName.trim() || !newPrice) return;
    setBumps([...bumps, {
      name: newName.trim(),
      price: Number(newPrice),
      label_bump: newLabel || "OFERTA ESPECIAL",
      description: newDesc,
      image_url: newImage,
    }]);
    setNewName("");
    setNewPrice("");
    setNewLabel("OFERTA ESPECIAL");
    setNewDesc("");
    setNewImage("");
    setShowAddForm(false);
  }

  return (
    <div className="space-y-5">
      {/* Order Bump Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
        <div>
          <Label className="text-sm font-semibold">Order Bump</Label>
          <p className="text-xs text-muted-foreground">Oferecer produto adicional no checkout</p>
        </div>
        <Switch checked={orderBumpEnabled} onCheckedChange={setOrderBumpEnabled} />
      </div>

      {orderBumpEnabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Produtos para Order Bump</Label>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Bump
            </button>
          </div>

          {showAddForm && (
            <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do produto bump" className="bg-input border-border" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Preço (R$)" className="bg-input border-border" />
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (OFERTA ESPECIAL)" className="bg-input border-border" />
              </div>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição curta (opcional)" className="bg-input border-border" />
              <Input value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="URL da imagem (opcional)" className="bg-input border-border" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddForm(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancelar</button>
                <button onClick={addBump} className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-semibold hover:bg-primary/90">Adicionar</button>
              </div>
            </div>
          )}

          {bumps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Bumps adicionados ({bumps.length})</p>
              {bumps.map((bump, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                  {bump.image_url ? (
                    <img src={bump.image_url} alt={bump.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{bump.name}</p>
                    <p className="text-xs text-primary font-semibold">R$ {bump.price.toFixed(2)}</p>
                  </div>
                  <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">{bump.label_bump}</span>
                  <button onClick={() => setBumps(bumps.filter((_, j) => j !== i))} className="p-1 text-destructive hover:text-destructive/80">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upsell Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border">
        <div>
          <Label className="text-sm font-semibold">Upsell Pós-Compra</Label>
          <p className="text-xs text-muted-foreground">Oferta exibida após pagamento confirmado</p>
        </div>
        <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} />
      </div>
    </div>
  );
}
