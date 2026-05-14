/* ============================================================
   HERO-SHADER.JS — GrainGradient WebGL background for hero
   Uses @paper-design/shaders vanilla API (ShaderMount)
   Amour Affairs · Premium Wedding Photography

   Uniform reference (from GLSL source):
     u_colorBack  vec4    — base background colour
     u_colors     vec4[7] — gradient stop colours
     u_colorsCount float  — how many stops to use
     u_softness   float   — blend softness
     u_intensity  float   — gradient strength
     u_noise      float   — grain amount
     u_shape      float   — 0=radial, 1=linear, 2=corners
     u_scale, u_rotation, u_offsetX, u_offsetY — transform
   ============================================================ */

import {
  ShaderMount,
  grainGradientFragmentShader,
  getShaderColorFromString,
} from '@paper-design/shaders';

export function initHeroShader() {
  // ShaderMount needs a PARENT DIV — it creates its own <canvas> internally
  const container = document.getElementById('heroShaderBg');
  if (!container) return null;

  // ── Champagne / warm-white palette ──────────────────────────
  // All strictly warm — no cool greys. The effect reads as a
  // gently breathing, premium cream canvas.
  const palette = [
    getShaderColorFromString('#EDE2D0'), // champagne gold
    getShaderColorFromString('#F5EDE0'), // warm linen
    getShaderColorFromString('#E8D9C4'), // antique parchment
    getShaderColorFromString('#F2E8D8'), // ivory blush
    getShaderColorFromString('#DDD0BA'), // muted gold
  ];

  const uniforms = {
    u_colorBack:   getShaderColorFromString('#FDFAF7'),   // off-white base
    u_colors:      [
      ...palette,
      getShaderColorFromString('#F7EFE2'), // pad to 7
      getShaderColorFromString('#EAE0CC'),
    ],
    u_colorsCount: palette.length,
    u_softness:    0.94,
    u_intensity:   0.13,   // very whisper-like
    u_noise:       0.015,
    u_shape:       2,      // corners
    u_scale:       1.8,
    u_rotation:    0,
    u_offsetX:     0,
    u_offsetY:     0,
  };

  // ShaderMount(parentElement, fragmentShader, uniforms, glAttributes, speed)
  // speed=0.4 → slow meditative drift
  const mount = new ShaderMount(
    container,
    grainGradientFragmentShader,
    uniforms,
    {},   // default WebGL context attributes
    0.4   // playback speed
  );

  mount.play();

  // Pause when hero scrolls fully offscreen (saves GPU)
  const io = new IntersectionObserver(
    ([entry]) => entry.isIntersecting ? mount.play() : mount.pause(),
    { threshold: 0 }
  );
  io.observe(container);

  return mount;
}
