import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { renderDiplomaDSL } from '@/diploma-dsl/renderer';
import { DIPLOMA_RECIPES, type DiplomaRecipe } from '@/constants/diplomaRecipes';

// Logical size the diploma is rendered at before being scaled into the card.
const BASE_W = 800;
const BASE_H = 585;

const RecipeThumb = ({ recipe, onPick, disabled }: { recipe: DiplomaRecipe; onPick: (prompt: string) => void; disabled?: boolean }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

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
    const { html, css } = renderDiplomaDSL(recipe.dsl);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}
      html,body{margin:0}
      body{width:${BASE_W}px;height:${BASE_H}px;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box}
      .diploma-container{max-height:100%}
    </style></head><body>${html}</body></html>`;
  }, [recipe]);

  return (
    <button
      type="button"
      onClick={() => onPick(recipe.prompt)}
      disabled={disabled}
      aria-label={`Start from the ${recipe.label} style`}
      className="group flex flex-col gap-1.5 text-left disabled:opacity-50 disabled:pointer-events-none"
    >
      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30 shadow-sm transition-colors group-hover:border-primary/50 group-focus-visible:border-primary"
        style={{ aspectRatio: `${BASE_W} / ${BASE_H}` }}
      >
        <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <iframe
            sandbox=""
            srcDoc={srcDoc}
            scrolling="no"
            title={recipe.label}
            style={{ width: BASE_W, height: BASE_H, border: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{recipe.label}</span>
    </button>
  );
};

export const RecipeGallery = ({ onPick, disabled }: { onPick: (prompt: string) => void; disabled?: boolean }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {DIPLOMA_RECIPES.map((recipe) => (
      <RecipeThumb key={recipe.id} recipe={recipe} onPick={onPick} disabled={disabled} />
    ))}
  </div>
);
