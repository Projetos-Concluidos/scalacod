import { useState, useEffect, useRef } from "react";
import { Mic, Info, Upload, Globe, Play, Pause, Heart, Trash2, Loader2, AlertTriangle, Music, X, Check, Star, Volume2, Send, CreditCard, QrCode, Copy, CheckCircle } from "lucide-react";
import { useFeatureGate, UpgradePrompt } from "@/hooks/useFeatureGate";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/integrations/supabase/types";
import NinjaBadge from "@/components/NinjaBadge";

type Voice = Tables<"voices">;
type VoiceTokens = Tables<"voice_tokens">;

interface LibraryVoice {
  id: string;
  name: string;
  previewUrl: string | null;
  category: string;
  labels: Record<string, string>;
  language: string | null;
  gender: string | null;
  useCase: string | null;
}

const packs = [
  { name: "Pack Iniciante", tokens: 5000, display: "5.000", price: "R$ 19,90", popular: false },
  { name: "Pack Essencial", tokens: 10000, display: "10.000", price: "R$ 39,90", popular: false },
  { name: "Pack Profissional", tokens: 50000, display: "50.000", price: "R$ 197,00", popular: true },
  { name: "Pack Enterprise", tokens: 100000, display: "100.000", price: "R$ 397,00", popular: false },
];

const FALLBACK_LIBRARY: LibraryVoice[] = [
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", previewUrl: null, category: "premade", labels: {}, language: "en", gender: "male", useCase: "narration" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", previewUrl: null, category: "premade", labels: {}, language: "en", gender: "female", useCase: "conversational" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", previewUrl: null, category: "premade", labels: {}, language: "pt", gender: "female", useCase: "narration" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", previewUrl: null, category: "premade", labels: {}, language: "en", gender: "male", useCase: "narration" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", previewUrl: null, category: "premade", labels: {}, language: "pt", gender: "female", useCase: "conversational" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", previewUrl: null, category: "premade", labels: {}, language: "pt", gender: "male", useCase: "formal" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", previewUrl: null, category: "premade", labels: {}, language: "en", gender: "female", useCase: "sweet" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", previewUrl: null, category: "premade", labels: {}, language: "en", gender: "male", useCase: "formal" },
];

const Vozes = () => {
  const gate = useFeatureGate("voices");
  const { user } = useAuth();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [tokenData, setTokenData] = useState<VoiceTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "library">("mine");
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneStep, setCloneStep] = useState(1);
  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<File[]>([]);
  const [cloning, setCloning] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libFilter, setLibFilter] = useState({ lang: "", gender: "" });
  const [libraryVoices, setLibraryVoices] = useState<LibraryVoice[]>(FALLBACK_LIBRARY);
  const [libLoading, setLibLoading] = useState(false);

  // Audio generation state per voice
  const [generateText, setGenerateText] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generatedAudio, setGeneratedAudio] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: voicesData }, { data: tokensData }] = await Promise.all([
      supabase.from("voices").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("voice_tokens").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setVoices(voicesData || []);
    setTokenData(tokensData);
    setLoading(false);
  };

  const fetchLibrary = async () => {
    setLibLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-voice-library");
      if (!error && data?.voices?.length > 0) {
        setLibraryVoices(data.voices);
      }
    } catch {
      // fallback already set
    } finally {
      setLibLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);
  useEffect(() => { if (tab === "library") fetchLibrary(); }, [tab]);

  const balance = tokenData?.balance || 0;
  const totalUsed = tokenData?.total_used || 0;
  const totalPurchased = tokenData?.total_purchased || 0;
  const usagePercent = totalPurchased > 0 ? Math.round((totalUsed / totalPurchased) * 100) : 0;

  const handlePlay = (previewUrl: string | null, id: string) => {
    if (!previewUrl) { toast.info("Preview não disponível"); return; }
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(previewUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(id);
  };

  const handleFavorite = async (libVoice: LibraryVoice) => {
    if (!user) return;
    const exists = voices.find(v => v.elevenlabs_voice_id === libVoice.id);
    if (exists) {
      toast.info("Voz já adicionada às suas vozes");
      return;
    }
    await supabase.from("voices").insert({
      user_id: user.id,
      name: libVoice.name,
      elevenlabs_voice_id: libVoice.id,
      is_cloned: false,
      is_favorite: true,
      preview_url: libVoice.previewUrl,
    });
    toast.success(`${libVoice.name} adicionada às suas vozes!`);
    fetchData();
  };

  const handleDeleteVoice = async (id: string) => {
    await supabase.from("voices").delete().eq("id", id);
    toast.success("Voz removida");
    fetchData();
  };

  const handleClone = async () => {
    if (!user || !cloneName || cloneFiles.length === 0) return;
    setCloning(true);
    setCloneStep(3);
    try {
      const formData = new FormData();
      formData.append("name", cloneName);
      formData.append("userId", user.id);
      for (const file of cloneFiles) {
        formData.append("files", file);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao clonar voz");

      setCloneStep(4);
      toast.success("Voz clonada com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao clonar voz");
      setCloneStep(2);
    } finally {
      setCloning(false);
    }
  };

  const handleGenerateAudio = async (voice: Voice) => {
    if (!user || !voice.elevenlabs_voice_id) return;
    const text = generateText[voice.id] || "Olá! Esta é minha voz no ScalaNinja.";
    if (!text.trim()) return;

    setGenerating(g => ({ ...g, [voice.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("generate-audio", {
        body: { voiceId: voice.elevenlabs_voice_id, text, userId: user.id },
      });

      if (error) throw new Error("Erro ao gerar áudio");
      if (data.error) throw new Error(data.error);

      setGeneratedAudio(a => ({ ...a, [voice.id]: data.audioUrl }));
      toast.success(`Áudio gerado! ${data.tokensUsed} tokens usados.`);
      fetchData(); // refresh balance
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar áudio");
    } finally {
      setGenerating(g => ({ ...g, [voice.id]: false }));
    }
  };

  const handleBuyTokens = async (pack: typeof packs[0]) => {
    if (!user) return;
    if (tokenData) {
      await supabase.from("voice_tokens").update({
        balance: (tokenData.balance || 0) + pack.tokens,
        total_purchased: (tokenData.total_purchased || 0) + pack.tokens,
      }).eq("id", tokenData.id);
    } else {
      await supabase.from("voice_tokens").insert({
        user_id: user.id,
        balance: pack.tokens,
        total_purchased: pack.tokens,
        total_used: 0,
      });
    }
    toast.success(`${pack.display} tokens adicionados!`);
    fetchData();
  };

  const filteredLibrary = libraryVoices.filter(v => {
    if (libFilter.lang && v.language !== libFilter.lang) return false;
    if (libFilter.gender) {
      const g = v.gender?.toLowerCase();
      if (libFilter.gender === "male" && g !== "male") return false;
      if (libFilter.gender === "female" && g !== "female") return false;
    }
    return true;
  });

  const resetClone = () => {
    setCloneOpen(false);
    setCloneStep(1);
    setCloneName("");
    setCloneFiles([]);
  };

  if (!gate.allowed) return <UpgradePrompt reason={gate.reason} />;

  return (
    <div>
      <PageHeader
        title="Vozes"
        subtitle="Gerencie suas vozes, explore a biblioteca e clone novas vozes"
        actions={
          <button onClick={() => { resetClone(); setCloneOpen(true); }} className="gradient-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Upload className="h-4 w-4" /> Clonar Voz
          </button>
        }
      />

      {/* Token section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        <div className="ninja-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo de Tokens</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Music className="h-4 w-4 text-primary" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-12 w-32 mb-4" />
          ) : (
            <p className="text-4xl font-bold text-foreground mb-4">{balance.toLocaleString("pt-BR")}</p>
          )}
          <div className="flex items-center gap-8 text-sm text-muted-foreground mb-4">
            <span>Tokens Usados: <strong className="text-foreground">{totalUsed.toLocaleString("pt-BR")}</strong></span>
            <span>Total Comprado: <strong className="text-foreground">{totalPurchased.toLocaleString("pt-BR")}</strong></span>
          </div>
          <Progress value={usagePercent} className="h-2 mb-3" />
          <p className="text-xs text-muted-foreground">
            Sua utilização atual é de {usagePercent}% do limite contratado. Tokens são descontados conforme a geração de áudio por inteligência artificial.
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
                <Star className="inline h-3 w-3 mr-0.5" /> Mais Popular
              </span>
            )}
            <p className="text-xs text-muted-foreground mb-2">{pack.name}</p>
            <p className="text-3xl font-bold text-foreground">{pack.display}</p>
            <p className="text-xs font-semibold text-primary mb-1">Tokens</p>
            <p className="text-lg font-bold text-foreground mb-4">{pack.price}</p>
            <button onClick={() => handleBuyTokens(pack)} className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
              pack.popular
                ? "gradient-primary text-primary-foreground hover:opacity-90"
                : "border border-border text-foreground hover:bg-muted"
            }`}>
              Comprar
            </button>
          </div>
        ))}
      </div>

      {/* Warning */}
      {balance === 0 && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-5 py-4">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Você ainda não tem tokens</p>
            <p className="text-xs text-muted-foreground">Compre um pacote acima para começar a gerar áudios com IA. Cada caractere do texto consome 1 token.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit mb-6">
        <button onClick={() => setTab("mine")} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "mine" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          🎙 Minhas Vozes
        </button>
        <button onClick={() => setTab("library")} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "library" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          🌐 Biblioteca
        </button>
      </div>

      {/* Minhas Vozes */}
      {tab === "mine" && (
        loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : voices.length === 0 ? (
          <EmptyState
            icon={<Mic className="h-12 w-12" />}
            title="Nenhuma voz ainda"
            description="Clone sua primeira voz ou explore a biblioteca e favorite as que mais gostar"
            action={
              <div className="flex items-center gap-3">
                <button onClick={() => { resetClone(); setCloneOpen(true); }} className="gradient-primary flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <Upload className="h-4 w-4" /> Clonar Voz
                </button>
                <button onClick={() => setTab("library")} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
                  <Globe className="h-4 w-4" /> Explorar Biblioteca
                </button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {voices.map(voice => (
              <div key={voice.id} className="ninja-card flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-foreground">{voice.name}</h3>
                  <NinjaBadge variant={voice.is_cloned ? "warning" : "info"}>
                    {voice.is_cloned ? "Clonada" : "Biblioteca"}
                  </NinjaBadge>
                </div>

                {/* Preview player */}
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => handlePlay(voice.preview_url, voice.id)} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0">
                    {playingId === voice.id ? <Pause className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary" />}
                  </button>
                  <div className="flex-1 h-1 rounded-full bg-muted">
                    <div className={`h-1 rounded-full bg-primary transition-all ${playingId === voice.id ? "w-1/2 animate-pulse" : "w-0"}`} />
                  </div>
                </div>

                {/* Audio generation */}
                {voice.elevenlabs_voice_id && (
                  <div className="mb-3 space-y-2">
                    <Textarea
                      value={generateText[voice.id] ?? "Olá! Esta é minha voz no ScalaNinja."}
                      onChange={e => setGenerateText(t => ({ ...t, [voice.id]: e.target.value }))}
                      placeholder="Digite o texto para gerar áudio..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleGenerateAudio(voice)}
                        disabled={generating[voice.id]}
                        className="flex-1 gradient-primary text-primary-foreground text-xs"
                      >
                        {generating[voice.id] ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Gerando...</>
                        ) : (
                          <><Volume2 className="h-3 w-3 mr-1" /> Gerar Áudio</>
                        )}
                      </Button>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {(generateText[voice.id] ?? "Olá! Esta é minha voz no ScalaNinja.").length} tokens
                      </span>
                    </div>
                    {generatedAudio[voice.id] && (
                      <audio controls src={generatedAudio[voice.id]} className="w-full h-8" />
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto">
                  <button className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors">Usar nos fluxos</button>
                  <button onClick={() => handleDeleteVoice(voice.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Biblioteca */}
      {tab === "library" && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <select value={libFilter.lang} onChange={e => setLibFilter(f => ({ ...f, lang: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="">Todos idiomas</option>
              <option value="pt">Português</option>
              <option value="en">Inglês</option>
            </select>
            <select value={libFilter.gender} onChange={e => setLibFilter(f => ({ ...f, gender: e.target.value }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
              <option value="">Todos gêneros</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
            {libLoading && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredLibrary.map(voice => {
              const isFav = voices.some(v => v.elevenlabs_voice_id === voice.id);
              return (
                <div key={voice.id} className="ninja-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-foreground">{voice.name}</h3>
                    <button onClick={() => handleFavorite(voice)} className={`transition-colors ${isFav ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                      <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {voice.language === "pt" ? "🇧🇷 PT" : voice.language === "en" ? "🇺🇸 EN" : voice.language || "—"}
                    </span>
                    <span>{voice.gender === "male" ? "Masculino" : voice.gender === "female" ? "Feminino" : voice.gender || ""}</span>
                    {voice.useCase && <span>• {voice.useCase}</span>}
                  </div>
                  <button onClick={() => handlePlay(voice.previewUrl, voice.id)} className="flex items-center gap-2 w-full rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                    {playingId === voice.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    Preview
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Clone Modal */}
      <Dialog open={cloneOpen} onOpenChange={v => !v && resetClone()}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Clonar Voz</DialogTitle>
          </DialogHeader>

          {cloneStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Voz</Label>
                <Input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="Ex: Minha Voz Comercial" />
              </div>
              <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Dica:</strong> Use áudios de pelo menos 1 minuto, sem ruído de fundo, com fala clara e natural. Quanto mais amostras, melhor a qualidade da clonagem.
                </p>
              </div>
              <Button onClick={() => setCloneStep(2)} disabled={!cloneName} className="w-full gradient-primary text-primary-foreground">
                Próximo
              </Button>
            </div>
          )}

          {cloneStep === 2 && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-foreground font-medium">Clique ou arraste arquivos aqui</p>
                <p className="text-xs text-muted-foreground mt-1">.mp3 ou .wav — mínimo 1 min, máximo 30 min</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav"
                  multiple
                  className="hidden"
                  onChange={e => {
                    if (e.target.files) setCloneFiles(Array.from(e.target.files));
                  }}
                />
              </div>
              {cloneFiles.length > 0 && (
                <div className="space-y-2">
                  {cloneFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                      <span className="text-foreground">{f.name}</span>
                      <span className="text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setCloneStep(1)} className="flex-1">Voltar</Button>
                <Button onClick={handleClone} disabled={cloneFiles.length === 0 || cloning} className="flex-1 gradient-primary text-primary-foreground">
                  {cloning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Iniciar Clonagem
                </Button>
              </div>
            </div>
          )}

          {cloneStep === 3 && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Processando voz no ElevenLabs...</p>
              <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          )}

          {cloneStep === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="h-12 w-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">Voz "{cloneName}" clonada!</p>
              <p className="text-xs text-muted-foreground">Ela já está disponível em "Minhas Vozes" para geração de áudio.</p>
              <Button onClick={resetClone} className="gradient-primary text-primary-foreground">Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vozes;
