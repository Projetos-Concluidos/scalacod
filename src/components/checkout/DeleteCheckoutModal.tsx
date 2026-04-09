import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  checkoutName: string;
  orderCount: number;
  deleting: boolean;
}

export default function DeleteCheckoutModal({ open, onClose, onConfirm, checkoutName, orderCount, deleting }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setConfirmed(false); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excluir Checkout
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground font-medium mb-2">
              Você está prestes a excluir o checkout:
            </p>
            <p className="text-sm font-bold text-foreground">"{checkoutName}"</p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>⚠️ Esta ação é <strong className="text-destructive">irreversível</strong> e irá:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Excluir permanentemente o checkout</li>
              {orderCount > 0 && <li>Desvincular <strong>{orderCount}</strong> pedido(s) associado(s)</li>}
              <li>Remover todos os leads capturados por este checkout</li>
              <li>Invalidar a URL pública do checkout</li>
            </ul>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-delete" className="text-xs text-foreground cursor-pointer leading-relaxed">
              <strong>SIM</strong>, entendo o que estou fazendo e desejo excluir permanentemente este checkout e todos os dados associados.
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setConfirmed(false); onClose(); }} className="text-muted-foreground">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={!confirmed || deleting}
            >
              {deleting ? "Excluindo..." : "Excluir Checkout"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
