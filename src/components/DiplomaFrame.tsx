import { useEffect, useRef, useState } from 'react';

interface DiplomaFrameProps {
  html: string;
  css: string;
  title?: string;
  className?: string;
  minHeight?: number;
  fitToWidth?: boolean;
}

const HEIGHT_MESSAGE_TYPE = 'DIPLOMA_FRAME_HEIGHT';

/**
 * Renders untrusted diploma HTML/CSS inside a sandboxed iframe so that
 * scripts in stored diplomas can never run in the app's origin.
 * The iframe reports its content height via postMessage for auto-sizing.
 */
export const DiplomaFrame = ({ html, css, title = 'Diploma', className, minHeight = 300, fitToWidth = false }: DiplomaFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

  const parsedLanguage = html.match(/<html[^>]*\blang=["']([^"']+)["']/i)?.[1];
  const language = parsedLanguage && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(parsedLanguage)
    ? parsedLanguage
    : 'sv-SE';
  const canvasWidth = /\.diploma-container\s*\{[^}]*max-width:\s*620px/i.test(css) ? 620 : 800;
  const safeCss = css.replace(/<\/style/gi, '<\\/style');
  const fitCss = fitToWidth
    ? `
body { overflow: hidden; }
#diploma-frame-canvas { width: ${canvasWidth}px; transform-origin: top left; }
#diploma-frame-canvas > .diploma-container { width: ${canvasWidth}px !important; max-width: ${canvasWidth}px !important; }
`
    : '';
  const framedHtml = fitToWidth ? `<div id="diploma-frame-canvas">${html}</div>` : html;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === HEIGHT_MESSAGE_TYPE && typeof event.data.height === 'number') {
        setHeight(Math.max(minHeight, Math.ceil(event.data.height)));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [minHeight]);

  const srcDoc = `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${safeCss}
body { margin: 0; padding: 0; overflow-x: hidden; }
${fitCss}
</style>
</head>
<body>
${framedHtml}
<script>
(function () {
  function send() {
    var canvas = document.getElementById('diploma-frame-canvas');
    if (canvas) {
      var available = document.documentElement.clientWidth;
      var scale = Math.min(1, available / ${canvasWidth});
      canvas.style.transform = 'scale(' + scale + ')';
      canvas.style.marginLeft = Math.max(0, (available - ${canvasWidth} * scale) / 2) + 'px';
      parent.postMessage({ type: '${HEIGHT_MESSAGE_TYPE}', height: Math.ceil(canvas.scrollHeight * scale) }, '*');
      return;
    }
    parent.postMessage({ type: '${HEIGHT_MESSAGE_TYPE}', height: document.documentElement.scrollHeight }, '*');
  }
  window.addEventListener('load', send);
  window.addEventListener('resize', send);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(send).observe(document.body);
  }
  send();
})();
</script>
</body>
</html>`;

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className={className}
      style={{ width: '100%', border: 'none', height }}
      title={title}
    />
  );
};
