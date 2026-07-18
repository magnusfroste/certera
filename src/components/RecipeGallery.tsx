import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { renderDSL } from '@/diploma-dsl/render';
import { DIPLOMA_RECIPES, type DiplomaRecipe } from '@/constants/diplomaRecipes';

// Logical canvas the diploma is rendered at before being scaled into the card.
// Sized so the tallest recipe fits without clipping (measured across all
// recipes); portrait recipes render on a narrower canvas (the renderer caps
// them at 620px wide) so their card is actually portrait-shaped.
const CANVAS = {
  landscape: { w: 800, h: 690 },
  portrait: { w: 660, h: 745 },
};

const RecipeThumb = ({ recipe, onPick, disabled }: { recipe: DiplomaRecipe; onPick: (recipe: DiplomaRecipe) => void; disabled?: boolean }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  const { w: baseW, h: baseH } = CANVAS[recipe.dsl.layout?.orientation === 'portrait' ? 'portrait' : 'landscape'];

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / baseW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW]);

  const srcDoc = useMemo(() => {
    const { html, css } = renderDSL(recipe.dsl);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}
      html,body{margin:0}
      body{width:${baseW}px;height:${baseH}px;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
      .diploma-container{max-height:100%}
    </style></head><body>${html}</body></html>`;
  }, [recipe, baseW, baseH]);

  return (
    <button
      type="button"
      onClick={() => onPick(recipe)}
      disabled={disabled}
      aria-label={`Start from the ${recipe.label} template`}
      className="group flex flex-col gap-1.5 text-left disabled:opacity-50 disabled:pointer-events-none"
    >
      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 shadow-sm transition-colors group-hover:border-primary/50 group-focus-visible:border-primary"
        style={{ aspectRatio: `${baseW} / ${baseH}` }}
      >
        <div style={{ width: baseW, height: baseH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <iframe
            sandbox=""
            srcDoc={srcDoc}
            scrolling="no"
            title={recipe.label}
            style={{ width: baseW, height: baseH, border: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">{recipe.label}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 shrink-0">{recipe.category}</span>
      </div>
    </button>
  );
};

export const RecipeGallery = ({ onPick, disabled }: { onPick: (recipe: DiplomaRecipe) => void; disabled?: boolean }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
    {DIPLOMA_RECIPES.map((recipe) => (
      <RecipeThumb key={recipe.id} recipe={recipe} onPick={onPick} disabled={disabled} />
    ))}
  </div>
);
