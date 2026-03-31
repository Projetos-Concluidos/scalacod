import { useState } from "react";
import { Smile, Sticker, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const emojiCategories = [
  {
    name: "E-commerce",
    emojis: ["🛒", "💳", "📦", "🚚", "✅", "❌", "⏳", "💰", "🔥", "⭐", "🎉", "👍", "👎", "🙏", "💪", "🤝"],
  },
  {
    name: "Atendimento",
    emojis: ["👋", "😊", "😄", "🤔", "😅", "😢", "😡", "🥳", "💬", "📞", "📧", "🔔", "⚠️", "ℹ️", "❓", "❗"],
  },
  {
    name: "Pagamento",
    emojis: ["💵", "💴", "💶", "💷", "🏦", "🧾", "📋", "✍️", "🔐", "🛡️", "💎", "🏆", "🎯", "📊", "📈", "📉"],
  },
  {
    name: "Entrega",
    emojis: ["🏠", "📍", "🗺️", "🛵", "🚗", "✈️", "⏰", "📅", "🎁", "📬", "📫", "🔄", "↩️", "⬆️", "✔️", "🆗"],
  },
  {
    name: "Rostos",
    emojis: ["😀", "😃", "😁", "😆", "😂", "🤣", "😍", "🥰", "😘", "😜", "🤗", "🤩", "😎", "🤑", "😇", "🙄"],
  },
];

const stickerPacks = [
  {
    name: "Vendas",
    stickers: [
      { emoji: "🛒✨", label: "Pedido confirmado!" },
      { emoji: "🚚💨", label: "Saiu para entrega" },
      { emoji: "📦✅", label: "Entregue!" },
      { emoji: "💳✔️", label: "Pagamento aprovado" },
      { emoji: "⏳📦", label: "Preparando pedido" },
      { emoji: "🔥💰", label: "Promoção!" },
      { emoji: "⭐⭐⭐⭐⭐", label: "Avaliação 5 estrelas" },
      { emoji: "🎉🛍️", label: "Compra realizada!" },
    ],
  },
  {
    name: "Suporte",
    stickers: [
      { emoji: "👋😊", label: "Olá! Como posso ajudar?" },
      { emoji: "✅👍", label: "Resolvido!" },
      { emoji: "⏳🔄", label: "Aguarde um momento" },
      { emoji: "📞💬", label: "Vou verificar" },
      { emoji: "🙏❤️", label: "Obrigado!" },
      { emoji: "🔔📱", label: "Nova atualização" },
      { emoji: "🤝✨", label: "Prazer em ajudar!" },
      { emoji: "📋✍️", label: "Anotado!" },
    ],
  },
];

const quickGifs = [
  { label: "Obrigado", url: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif" },
  { label: "Celebrar", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
  { label: "OK", url: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif" },
  { label: "Aplausos", url: "https://media.giphy.com/media/YRuFixSNWFVcXaxpmX/giphy.gif" },
  { label: "Entrega", url: "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif" },
  { label: "Dinheiro", url: "https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif" },
];

type Tab = "emoji" | "sticker" | "gif";

interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (text: string) => void;
  onSelectGif: (url: string) => void;
  onClose: () => void;
}

export default function EmojiStickerPicker({ onSelectEmoji, onSelectSticker, onSelectGif, onClose }: EmojiStickerPickerProps) {
  const [tab, setTab] = useState<Tab>("emoji");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "emoji", label: "Emoji", icon: Smile },
    { id: "sticker", label: "Figurinhas", icon: Sticker },
    { id: "gif", label: "GIFs", icon: () => <span className="text-xs font-bold">GIF</span> },
  ];

  return (
    <div className="absolute bottom-full left-0 mb-2 w-[320px] rounded-xl border border-border bg-card shadow-lg z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Buscar ${tab === "emoji" ? "emoji" : tab === "sticker" ? "figurinha" : "GIF"}...`}
            className="h-8 w-full rounded-lg border border-border bg-input pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[280px] overflow-y-auto p-3">
        {tab === "emoji" && (
          <div className="space-y-3">
            {emojiCategories
              .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.emojis.some(e => e.includes(search)))
              .map(category => (
                <div key={category.name}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{category.name}</p>
                  <div className="grid grid-cols-8 gap-1">
                    {category.emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onSelectEmoji(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-muted transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === "sticker" && (
          <div className="space-y-3">
            {stickerPacks
              .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.stickers.some(s => s.label.toLowerCase().includes(search.toLowerCase())))
              .map(pack => (
                <div key={pack.name}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{pack.name}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {pack.stickers
                      .filter(s => !search || s.label.toLowerCase().includes(search.toLowerCase()))
                      .map(sticker => (
                        <button
                          key={sticker.label}
                          onClick={() => onSelectSticker(`${sticker.emoji} ${sticker.label}`)}
                          className="flex items-center gap-2 rounded-lg border border-border p-2 text-left hover:bg-muted transition-colors"
                        >
                          <span className="text-lg">{sticker.emoji}</span>
                          <span className="text-[10px] text-foreground leading-tight">{sticker.label}</span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {tab === "gif" && (
          <div className="grid grid-cols-2 gap-2">
            {quickGifs
              .filter(g => !search || g.label.toLowerCase().includes(search.toLowerCase()))
              .map(gif => (
                <button
                  key={gif.label}
                  onClick={() => onSelectGif(gif.url)}
                  className="group relative overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                >
                  <img src={gif.url} alt={gif.label} className="h-20 w-full object-cover" loading="lazy" />
                  <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] font-medium text-white">
                    {gif.label}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
