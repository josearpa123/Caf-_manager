// Ilustración de línea propia (SVG a mano, sin imágenes externas — el CSP
// del artifact/host no permite CDNs). Taza + vapor + una rama con cerezas de
// café, apoyada sobre una mancha orgánica de fondo. Usa currentColor y los
// tokens de la app para que se vea bien en claro/oscuro.
export function CoffeeIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 420"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M210 34C295 34 356 84 366 168C376 252 334 322 250 356C166 390 74 360 42 278C10 196 42 100 118 58C154 38 178 34 210 34Z"
        fill="hsl(var(--primary) / 0.1)"
      />

      {/* vapor */}
      <g stroke="hsl(var(--primary) / 0.55)" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M164 168C152 146 174 134 162 112C150 90 172 78 164 56" className="steam-1" />
        <path d="M204 172C192 150 214 138 202 116C190 94 212 82 204 60" className="steam-2" />
        <path d="M244 168C232 146 254 134 242 112C230 90 252 78 244 56" className="steam-3" />
      </g>

      {/* platillo */}
      <ellipse cx="204" cy="292" rx="104" ry="16" fill="hsl(var(--primary) / 0.12)" />

      {/* taza */}
      <path
        d="M120 196H272V244C272 279.346 243.346 308 208 308H184C148.654 308 120 279.346 120 244V196Z"
        fill="hsl(var(--card))"
        stroke="hsl(var(--primary))"
        strokeWidth="7"
      />
      <path
        d="M120 196H272"
        stroke="hsl(var(--primary))"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M276 210C298 210 312 224 312 242C312 260 298 274 276 274"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* rama con cerezas */}
      <path
        d="M84 340C120 322 128 296 118 268"
        fill="none"
        stroke="hsl(var(--success))"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M96 300C82 292 66 294 54 306"
        fill="none"
        stroke="hsl(var(--success))"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <ellipse
        cx="46"
        cy="308"
        rx="16"
        ry="10"
        transform="rotate(-32 46 308)"
        fill="hsl(var(--success) / 0.25)"
        stroke="hsl(var(--success))"
        strokeWidth="4"
      />
      <circle cx="106" cy="272" r="11" fill="hsl(var(--destructive) / 0.85)" />
      <circle cx="126" cy="290" r="11" fill="hsl(var(--destructive) / 0.7)" />
      <circle cx="90" cy="296" r="11" fill="hsl(var(--destructive) / 0.55)" />

      {/* granos sueltos */}
      <g fill="hsl(var(--primary) / 0.35)">
        <ellipse cx="330" cy="120" rx="12" ry="8" transform="rotate(28 330 120)" />
        <ellipse cx="352" cy="150" rx="10" ry="7" transform="rotate(-18 352 150)" />
        <ellipse cx="318" cy="330" rx="11" ry="7" transform="rotate(40 318 330)" />
      </g>

      <style>{`
        .steam-1, .steam-2, .steam-3 { animation: rise 3.2s ease-in-out infinite; transform-origin: center; }
        .steam-2 { animation-delay: .5s; }
        .steam-3 { animation-delay: 1s; }
        @keyframes rise {
          0% { opacity: 0; transform: translateY(6px); }
          35% { opacity: .8; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .steam-1, .steam-2, .steam-3 { animation: none; opacity: .5; }
        }
      `}</style>
    </svg>
  );
}
