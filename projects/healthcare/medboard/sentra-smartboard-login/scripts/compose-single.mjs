// Composes dist-single/app.{js,css} into one HTML fragment for sharing as a preview page.
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('dist-single/app.css', 'utf8');
const js = readFileSync('dist-single/app.js', 'utf8').replace(/<\/script/g, '<\\/script');

const html = `<title>Sentra Medical Smartboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync('dist-single/sentra-medical-smartboard.html', html);
console.log('wrote dist-single/sentra-medical-smartboard.html', (html.length / 1024).toFixed(1) + ' KB');
