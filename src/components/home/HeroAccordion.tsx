import { useState } from "react";
import { motion } from "framer-motion";

const panels = [
  { title: "Dashboard", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" },
  { title: "Checkout", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80" },
  { title: "Kanban", img: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&q=80" },
  { title: "WhatsApp", img: "https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80" },
  { title: "Analytics", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" },
];

export function HeroAccordion() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex h-[400px] gap-2 overflow-hidden rounded-2xl">
      {panels.map((panel, i) => (
        <motion.div
          key={panel.title}
          className="relative cursor-pointer overflow-hidden rounded-xl"
          animate={{ flex: active === i ? 4 : 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onMouseEnter={() => setActive(i)}
        >
          <img
            src={panel.img}
            alt={panel.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <span className={`text-sm font-bold text-white transition-opacity ${active === i ? "opacity-100" : "opacity-70"}`}>
              {panel.title}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
