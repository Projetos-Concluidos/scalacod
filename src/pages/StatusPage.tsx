import { CheckCircle } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

const services = [
  { name: "API & Dashboard", status: "Operacional", uptime: "99.9%" },
  { name: "Checkout COD", status: "Operacional", uptime: "99.8%" },
  { name: "WhatsApp Gateway", status: "Operacional", uptime: "99.7%" },
  { name: "Logzz Integration", status: "Operacional", uptime: "99.9%" },
  { name: "Coinzz Integration", status: "Operacional", uptime: "99.8%" },
  { name: "Webhooks", status: "Operacional", uptime: "99.9%" },
  { name: "Pixel & CAPI", status: "Operacional", uptime: "99.9%" },
  { name: "Flow Engine", status: "Operacional", uptime: "99.8%" },
];

export default function StatusPage() {
  return (
    <PublicLayout>
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-4xl font-black text-white">Status dos Serviços</h1>
            <p className="mt-3 text-lg text-emerald-400 font-semibold">Todos os sistemas operacionais</p>
            <p className="mt-2 text-sm text-gray-500">Atualizado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>

          <div className="mt-12 space-y-3">
            {services.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-gray-950 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                  <span className="text-sm font-medium text-white">{svc.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">Uptime {svc.uptime}</span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">{svc.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-gray-950 p-6 text-center">
            <h3 className="text-base font-bold text-white">Histórico de incidentes</h3>
            <p className="mt-2 text-sm text-gray-500">Nenhum incidente nos últimos 90 dias. 🎉</p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
