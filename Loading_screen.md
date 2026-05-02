<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Loading — Siannah & Diego</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>

/* ══ TOKENS ══════════════════════════════════════════════════════════════ */
:root {
  --color-bg:           #1a1714;
  --color-bg-deep:      #0f0d0b;
  --color-primary:      #c9a84c;
  --color-primary-soft: #e8d08a;
  --color-text:         #faf7f2;
  --color-text-soft:    rgba(250,247,242,0.78);
  --color-text-dim:     rgba(250,247,242,0.45);
  --font-serif:         'Cormorant Garamond', serif;
  --font-sans:          'Jost', sans-serif;
}

*,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

body {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at top, rgba(201,168,76,0.06), transparent 60%),
    linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-deep) 100%);
  font-family: var(--font-sans);
  color: var(--color-text);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE LOADER
══════════════════════════════════════════════════════════════════════════ */
.page-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background:
    radial-gradient(ellipse at center, rgba(201,168,76,0.04) 0%, transparent 50%),
    linear-gradient(180deg, var(--color-bg) 0%, var(--color-bg-deep) 100%);
  transition: opacity 0.6s ease, visibility 0.6s ease;
}
.page-loader.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* Partículas flutuantes ao fundo */
.page-loader::before,
.page-loader::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%,
    rgba(255,255,255,0.08) 0%,
    rgba(232,208,138,0.04) 40%,
    transparent 70%);
  pointer-events: none;
}
.page-loader::before {
  width: 12px; height: 12px;
  top: 35%; left: 22%;
  animation: floatUp 8s ease-in-out infinite;
  animation-delay: -2s;
}
.page-loader::after {
  width: 18px; height: 18px;
  top: 65%; right: 18%;
  animation: floatUp 10s ease-in-out infinite;
  animation-delay: -5s;
}

@keyframes floatUp {
  0%,100% { transform: translateY(0) translateX(0); opacity: 0.4; }
  25%     { transform: translateY(-30px) translateX(10px); opacity: 0.7; }
  50%     { transform: translateY(-60px) translateX(-8px); opacity: 0.4; }
  75%     { transform: translateY(-90px) translateX(15px); opacity: 0.6; }
}

/* ══════════════════════════════════════════════════════════════════════════
   ANEL DE PROGRESSO ao redor da bolha
   Indica visualmente que algo está acontecendo — gira continuamente
══════════════════════════════════════════════════════════════════════════ */
.loader-progress-ring {
  position: absolute;
  width: 220px;
  height: 220px;
  pointer-events: none;
  animation: ringRotate 2.4s linear infinite;
}

@keyframes ringRotate {
  to { transform: rotate(360deg); }
}

.loader-progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* começa do topo */
}

.loader-progress-track {
  fill: none;
  stroke: rgba(201,168,76,0.08);
  stroke-width: 1;
}

.loader-progress-arc {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-dasharray: 660;          /* circumferência aproximada */
  stroke-dashoffset: 495;         /* mostra ~25% do anel */
  filter: drop-shadow(0 0 6px rgba(201,168,76,0.5));
  animation: arcPulse 2.4s ease-in-out infinite;
}

@keyframes arcPulse {
  0%,100% { stroke-dashoffset: 495; opacity: 0.9; }
  50%     { stroke-dashoffset: 380; opacity: 1; }
}

/* ══════════════════════════════════════════════════════════════════════════
   BOLHA DE SABÃO
══════════════════════════════════════════════════════════════════════════ */
.bubble-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  animation: bubbleFloat 6s ease-in-out infinite;
}

@keyframes bubbleFloat {
  0%,100% { transform: translateY(0) rotate(0deg); }
  25%     { transform: translateY(-6px) rotate(0.5deg); }
  50%     { transform: translateY(-3px) rotate(-0.3deg); }
  75%     { transform: translateY(-8px) rotate(0.4deg); }
}

.bubble-shadow {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 16px;
  background: radial-gradient(ellipse at center,
    rgba(201,168,76,0.18) 0%,
    rgba(201,168,76,0.08) 40%,
    transparent 70%);
  filter: blur(6px);
  animation: shadowPulse 6s ease-in-out infinite;
}
@keyframes shadowPulse {
  0%,100% { transform: translateX(-50%) scale(1); opacity: 0.8; }
  50%     { transform: translateX(-50%) scale(0.85); opacity: 0.5; }
}

.bubble {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 25%,
      rgba(255,255,255,0.25) 0%,
      rgba(232,208,138,0.10) 25%,
      rgba(201,168,76,0.06) 50%,
      rgba(255,255,255,0.04) 80%,
      rgba(0,0,0,0.05) 100%);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow:
    inset 0 0 60px rgba(255,255,255,0.08),
    inset 0 -20px 40px rgba(201,168,76,0.06),
    inset 20px 20px 40px rgba(255,255,255,0.05),
    0 0 60px rgba(201,168,76,0.12),
    0 0 100px rgba(232,208,138,0.06);
  backdrop-filter: blur(2px);
  overflow: hidden;
}

.bubble-iridescence {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg at 50% 50%,
      rgba(232,208,138,0.18) 0%,
      rgba(255,200,200,0.12) 12%,
      rgba(180,200,255,0.14) 25%,
      rgba(200,180,255,0.10) 38%,
      rgba(180,255,220,0.12) 50%,
      rgba(255,220,180,0.14) 62%,
      rgba(232,208,138,0.16) 75%,
      rgba(255,200,200,0.10) 88%,
      rgba(232,208,138,0.18) 100%);
  mix-blend-mode: screen;
  opacity: 0.7;
  animation: iridescentSpin 14s linear infinite;
}
@keyframes iridescentSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.bubble-highlight {
  position: absolute;
  top: 12%;
  left: 18%;
  width: 38%;
  height: 28%;
  background: radial-gradient(ellipse at center,
    rgba(255,255,255,0.55) 0%,
    rgba(255,255,255,0.18) 40%,
    transparent 70%);
  border-radius: 50%;
  filter: blur(3px);
  transform: rotate(-25deg);
  animation: highlightShimmer 4s ease-in-out infinite;
}
@keyframes highlightShimmer {
  0%,100% { opacity: 0.7; transform: rotate(-25deg) scale(1); }
  50%     { opacity: 1;   transform: rotate(-25deg) scale(1.05); }
}

.bubble-highlight-small {
  position: absolute;
  bottom: 22%;
  right: 25%;
  width: 14%;
  height: 10%;
  background: radial-gradient(ellipse at center,
    rgba(255,255,255,0.4) 0%,
    transparent 70%);
  border-radius: 50%;
  filter: blur(2px);
  animation: highlightSmallPulse 3s ease-in-out infinite;
}
@keyframes highlightSmallPulse {
  0%,100% { opacity: 0.5; }
  50%     { opacity: 0.9; }
}

/* ══ INICIAIS DENTRO DA BOLHA ════════════════════════════════════════════ */
.bubble-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  z-index: 2;
}

.bubble-letter {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 50px;
  font-weight: 400;
  color: var(--color-primary-soft);
  text-shadow:
    0 1px 2px rgba(0,0,0,0.3),
    0 0 12px rgba(232,208,138,0.4),
    0 0 24px rgba(201,168,76,0.2);
  line-height: 1;
}

.bubble-amp {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 24px;
  font-weight: 300;
  color: rgba(250,247,242,0.65);
  margin: 0 2px;
  transform: translateY(-2px);
}

/* ══════════════════════════════════════════════════════════════════════════
   TEXTO "AGUARDE" + DOTS
   O elemento mais explícito de loading — texto direto + dots animados
══════════════════════════════════════════════════════════════════════════ */
.loader-status {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  /* Aparece com fade depois da bolha */
  animation: statusFadeIn 1s ease 0.3s backwards;
}

@keyframes statusFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.loader-status-text {
  font-family: var(--font-sans);
  font-size: 10px;
  font-weight: 300;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--color-text-dim);
}

/* Três bolinhas que pulsam em sequência */
.loader-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.loader-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-primary);
  opacity: 0.3;
  animation: dotPulse 1.4s ease-in-out infinite;
}
.loader-dot:nth-child(1) { animation-delay: 0s; }
.loader-dot:nth-child(2) { animation-delay: 0.2s; }
.loader-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotPulse {
  0%,60%,100% { opacity: 0.3; transform: scale(1); }
  30%         { opacity: 1; transform: scale(1.4); box-shadow: 0 0 8px rgba(201,168,76,0.6); }
}

/* ══════════════════════════════════════════════════════════════════════════
   BARRA DE PROGRESSO LINEAR
   Aparece embaixo de tudo. Linha fina elegante que enche da esquerda
══════════════════════════════════════════════════════════════════════════ */
.loader-bar-wrap {
  width: 200px;
  margin-top: 8px;
  animation: statusFadeIn 1s ease 0.5s backwards;
}

.loader-bar-track {
  position: relative;
  width: 100%;
  height: 1px;
  background: rgba(201,168,76,0.12);
  overflow: hidden;
}

/*
  A barra usa duas técnicas:
  - Indeterminada (padrão): faixa que viaja da esquerda para direita
  - Determinada (se o JS souber o progresso real): width fixa
*/
.loader-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 30%;
  background: linear-gradient(to right,
    transparent,
    var(--color-primary),
    var(--color-primary-soft),
    var(--color-primary),
    transparent);
  animation: barSlide 1.8s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(201,168,76,0.4);
}

@keyframes barSlide {
  0%   { left: -30%; }
  100% { left: 100%; }
}

/* ══════════════════════════════════════════════════════════════════════════
   DATA — fica embaixo de tudo, mantendo a identidade do convite
══════════════════════════════════════════════════════════════════════════ */
.loader-date-wrap {
  text-align: center;
  margin-top: 16px;
  animation: statusFadeIn 1s ease 0.7s backwards;
}

.loader-date-line {
  width: 50px;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--color-primary), transparent);
  margin: 0 auto 12px;
  opacity: 0.5;
}

.loader-date {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 300;
  letter-spacing: 0.42em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

/* ══ RESPONSIVO ══════════════════════════════════════════════════════════ */
@media (max-width: 480px) {
  .loader-progress-ring { width: 200px; height: 200px; }
  .bubble-wrap { width: 140px; height: 140px; }
  .bubble-letter { font-size: 42px; }
  .bubble-amp { font-size: 20px; }
  .loader-status-text { font-size: 9px; letter-spacing: 0.35em; }
  .loader-bar-wrap { width: 180px; }
  .loader-date { font-size: 10px; letter-spacing: 0.36em; }
}

/* ══ DEMO ════════════════════════════════════════════════════════════════ */
.demo-controls {
  position: fixed;
  bottom: 24px; left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex; gap: 10px;
  opacity: 0;
  transition: opacity 0.4s;
}
.page-loader.is-hidden ~ .demo-controls { opacity: 1; }
.demo-btn {
  padding: 10px 20px;
  background: rgba(201,168,76,0.1);
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--color-primary-soft);
  font-family: var(--font-sans);
  font-size: 10px; font-weight: 300;
  letter-spacing: 0.28em; text-transform: uppercase;
  cursor: pointer;
}
.demo-btn:hover {
  background: rgba(201,168,76,0.2);
  border-color: var(--color-primary);
}
</style>
</head>
<body>

<!-- ══ PAGE LOADER ════════════════════════════════════════════════════════ -->
<div class="page-loader" id="pageLoader" role="status" aria-live="polite" aria-label="Carregando">

  <!-- Container que abriga o anel + a bolha juntos -->
  <div style="position:relative; display:flex; align-items:center; justify-content:center;">

    <!-- Anel de progresso girando ao redor -->
    <div class="loader-progress-ring" aria-hidden="true">
      <svg viewBox="0 0 220 220">
        <!-- Trilha do anel — sempre visível -->
        <circle class="loader-progress-track" cx="110" cy="110" r="105"/>
        <!-- Arco de progresso — gira ao redor -->
        <circle class="loader-progress-arc" cx="110" cy="110" r="105"/>
      </svg>
    </div>

    <!-- Bolha no centro do anel -->
    <div class="bubble-wrap">
      <div class="bubble-shadow"></div>
      <div class="bubble">
        <div class="bubble-iridescence"></div>
        <div class="bubble-highlight"></div>
        <div class="bubble-highlight-small"></div>
      </div>
      <div class="bubble-content" aria-hidden="true">
        <span class="bubble-letter">S</span>
        <span class="bubble-amp">&amp;</span>
        <span class="bubble-letter">D</span>
      </div>
    </div>

  </div>

  <!-- Texto explícito + dots pulsantes -->
  <div class="loader-status">
    <span class="loader-status-text">Carregando convite</span>
    <div class="loader-dots" aria-hidden="true">
      <span class="loader-dot"></span>
      <span class="loader-dot"></span>
      <span class="loader-dot"></span>
    </div>
  </div>

  <!-- Barra de progresso indeterminada -->
  <div class="loader-bar-wrap" aria-hidden="true">
    <div class="loader-bar-track">
      <div class="loader-bar-fill"></div>
    </div>
  </div>

  <!-- Data com identidade do convite -->
  <div class="loader-date-wrap">
    <div class="loader-date-line"></div>
    <p class="loader-date">06 . 09 . 2026</p>
  </div>

</div>

<!-- Conteúdo de fundo (apenas demo) -->
<div style="text-align:center; opacity:0.3;">
  <h1 style="font-family:var(--font-serif); font-style:italic; font-size:48px; color:var(--color-primary-soft);">
    Conteúdo da página
  </h1>
  <p style="margin-top:12px; color:var(--color-text-dim); letter-spacing:0.14em;">
    Aqui apareceria o resto do site após o carregamento
  </p>
</div>

<div class="demo-controls">
  <button class="demo-btn" onclick="document.getElementById('pageLoader').classList.add('is-hidden')">
    Esconder loader
  </button>
  <button class="demo-btn" onclick="document.getElementById('pageLoader').classList.remove('is-hidden')">
    Mostrar loader
  </button>
</div>

</body>
</html>