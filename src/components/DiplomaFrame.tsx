import { useEffect, useRef, useState } from 'react';

interface DiplomaFrameProps {
  html: string;
  css: string;
  title?: string;
  className?: string;
  minHeight?: number;
}

const HEIGHT_MESSAGE_TYPE = 'DIPLOMA_FRAME_HEIGHT';

/**
 * Renders untrusted diploma HTML/CSS inside a sandboxed iframe so that
 * scripts in stored diplomas can never run in the app's origin.
 * The iframe reports its content height via postMessage for auto-sizing.
 */
export const DiplomaFrame = ({ html, css, title = 'Diploma', className, minHeight = 300 }: DiplomaFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(minHeight);

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
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css.replace(/<\/style/gi, '<\\/style')}
body { margin: 0; padding: 0; overflow-x: hidden; }
</style>
</head>
<body>
${html}
<script>
(function () {
  function send() {
    parent.postMessage({ type: '${HEIGHT_MESSAGE_TYPE}', height: document.documentElement.scrollHeight }, '*');
  }
  window.addEventListener('load', send);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(send).observe(document.documentElement);
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
