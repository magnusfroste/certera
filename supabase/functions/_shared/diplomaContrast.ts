// Pure colour math shared by client and edge renderers. Curated backgrounds
// stay unchanged; only foregrounds are corrected (AA even for small text).
export function relativeLuminance(hex: string): number {
  const expanded = hex.length === 4 ? '#' + hex.slice(1).split('').map(c => c + c).join('') : hex;
  const channels = [1, 3, 5].map(i => {
    const value = parseInt(expanded.slice(i, i + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function backgroundSamples(css: string): string[] {
  const stops = css.match(/#[0-9a-f]{6}\b/gi) || ['#ffffff'];
  const samples = [...stops];
  // Include gradient interiors and a conservative allowance for the curated
  // translucent textures/watermarks, rather than testing one average colour.
  for (let i = 1; i < stops.length; i++) {
    for (let step = 1; step < 20; step++) {
      samples.push('#' + [1, 3, 5].map(channel => {
        const a = parseInt(stops[i - 1].slice(channel, channel + 2), 16);
        const b = parseInt(stops[i].slice(channel, channel + 2), 16);
        return Math.round(a + (b - a) * step / 20).toString(16).padStart(2, '0');
      }).join(''));
    }
  }
  return samples.flatMap(sample => [sample, ...[0, 255].map(target => '#' + [1, 3, 5].map(channel => {
    const value = parseInt(sample.slice(channel, channel + 2), 16);
    return Math.round(value * 0.92 + target * 0.08).toString(16).padStart(2, '0');
  }).join(''))]);
}

export function ensureTextContrast(preferred: string, backgrounds: string[]): string {
  const minRatio = (color: string) => Math.min(...backgrounds.map(bg => contrastRatio(color, bg)));
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(preferred) && minRatio(preferred) >= 4.5) return preferred;
  return minRatio('#ffffff') > minRatio('#000000') ? '#ffffff' : '#000000';
}