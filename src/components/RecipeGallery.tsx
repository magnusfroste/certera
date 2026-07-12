import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { renderDSL } from '@/diploma-dsl/render';
import { DIPLOMA_RECIPES, type DiplomaRecipe } from '@/constants/diplomaRecipes';

// Logical width the diploma is rendered at before being scaled into the card.
const BASE_W = 800;

const RecipeThumb = ({ recipe, onPick, disabled }: { recipe: DiplomaRecipe; onPick: (recipe: DiplomaRecipe) => void; disabled?: boolean }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  // Portrait recipes get a taller logical canvas so the thumbnail isn't cropped.
  const baseH = recipe.dsl.layout?.orientation === 'portrait' ? 1040 : 585;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / BASE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const srcDoc = useMemo(() => {
    const { html, css } = renderDSL(recipe.dsl);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}
      html,body{margin:0}
      body{width:${BASE_W}px;height:${baseH}px;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}
      .diploma-container{max-height:100%}
    </style></head><body>${html}</body></html>`;
  }, [recipe, baseH]);

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
        style={{ aspectRatio: `${BASE_W} / ${baseH}` }}
      >
        <div style={{ width: BASE_W, height: baseH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <iframe
            sandbox=""
            srcDoc={srcDoc}
            scrolling="no"
            title={recipe.label}
            style={{ width: BASE_W, height: baseH, border: 0, pointerEvents: 'none' }}
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
