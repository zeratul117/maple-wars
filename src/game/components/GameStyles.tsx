import { TILE } from "../constants";

export function GameStyles() {
  return (
    <style>{`
      body { margin: 0; }
      .tile { width: ${TILE}px; height: ${TILE}px; image-rendering: pixelated; }
      .plain { background: linear-gradient(45deg,#aee857 25%,#c8f36e 25% 50%,#b9eb5c 50% 75%,#d4fb77 75%); background-size: 14px 14px; }
      .forest { background: linear-gradient(45deg,#7fcf44,#b7ec5e); }
      .mountain { background: linear-gradient(45deg,#cbb64b,#f4df73); }
      .road { background: #9198a7; }
      .river { background: #567cff; }
      .bridge { background: #73dff8; }
      .city, .factory, .airport, .hq { background: linear-gradient(45deg,#b8ea5b,#d8ff78); }
      .airport { background: linear-gradient(45deg,#b2de63,#d9ff84); }
      .city.owned-player, .factory.owned-player, .airport.owned-player, .hq.owned-player {
        background: linear-gradient(45deg,#5aa7ff,#9fd3ff);
      }
      .city.owned-ai, .factory.owned-ai, .airport.owned-ai, .hq.owned-ai {
        background: linear-gradient(45deg,#ff6b6b,#ffb1a8);
      }
      .city.owned-player span, .factory.owned-player span, .airport.owned-player span, .hq.owned-player span,
      .city.owned-ai span, .factory.owned-ai span, .airport.owned-ai span, .hq.owned-ai span {
        filter: drop-shadow(0 2px 0 rgba(0,0,0,.35));
      }
      .target-reticle { position: relative; width: 42px; height: 42px; border: 5px solid #0f1235; border-radius: 999px; animation: reticlePulse 0.9s ease-in-out infinite; box-shadow: 0 0 18px rgba(255,255,255,.35); }
      .target-reticle::before, .target-reticle::after { content: ""; position: absolute; background: #16c1a1; border-radius: 999px; left: 50%; top: 50%; transform: translate(-50%, -50%); }
      .target-reticle::before { width: 6px; height: 26px; }
      .target-reticle::after { width: 26px; height: 6px; }
      @keyframes reticlePulse { 0% { transform: scale(0.9) rotate(0deg); opacity: 0.75; } 50% { transform: scale(1.05) rotate(6deg); opacity: 1; } 100% { transform: scale(0.9) rotate(0deg); opacity: 0.75; } }
      .unit-pop {
        filter: drop-shadow(0 0 7px rgba(255,255,255,.55)) drop-shadow(0 5px 0 rgba(0,0,0,.45));
      }
      .unit-exhausted {
        filter: grayscale(1) saturate(0) brightness(0.92) contrast(1.08) drop-shadow(0 4px 0 rgba(0,0,0,.45));
      }
      .hp-number {
        display: inline-block;
        font-size: 28px;
        font-weight: 1000;
        line-height: 1;
        letter-spacing: -2px;
        color: #ff8c1a;
        -webkit-text-stroke: 2px white;
        text-shadow:
          -2px -2px 0 #222,
           2px -2px 0 #222,
          -2px  2px 0 #222,
           2px  2px 0 #222,
           0px  3px 0 rgba(0,0,0,.55);
      }
      .wall {
        background: linear-gradient(45deg,#4b5563,#1f2937);
      }
    `}</style>
  );
}
