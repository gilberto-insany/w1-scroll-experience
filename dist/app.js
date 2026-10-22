import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = () => window.innerWidth <= 800;
const state = { fill: 0, turn: 0, size: 1, x: 0, y: 0, pointerX: 0, pointerY: 0 };
const fillUniform = { value: 0 };
let renderer, scene, camera, logo, animationFrame, environmentMap;
let isVisible = true;
const stage = document.getElementById('logo-stage');

async function createLogo() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.setClearColor(0x080909, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    stage.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 0, 14);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environmentMap = pmrem.fromScene(room, .04);
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = .7;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x91b9af, 1.4);
    rim.position.set(5, 2, -2);
    scene.add(rim);
    const lower = new THREE.DirectionalLight(0xc9ddd4, .65);
    lower.position.set(1, -5, 3);
    scene.add(lower);
    const material = new THREE.MeshPhysicalMaterial({ color: 0x1b211e, metalness: .96, roughness: .24, clearcoat: 1, clearcoatRoughness: .19, envMapIntensity: 1.9 });
    material.onBeforeCompile = shader => {
      shader.uniforms.uFill = fillUniform;
      shader.vertexShader = 'varying float vLogoY;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLogoY = position.y;');
      shader.fragmentShader = 'uniform float uFill;\nvarying float vLogoY;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float w1Fill = smoothstep(-0.75, 0.75, vLogoY - (20.0 - uFill * 40.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.008, 0.36, 0.245), w1Fill);`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.27, w1Fill);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.5, w1Fill);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.006, 0.09, 0.065) * w1Fill;');
    };
    const response = await fetch('./assets/w1.svg');
    if (!response.ok) throw new Error('Logo indisponível');
    const svg = new SVGLoader().parse(await response.text());
    logo = new THREE.Group();
    for (const path of svg.paths) {
      if (path.userData?.node?.nodeName !== 'path') continue;
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, steps: 1, bevelEnabled: true, bevelThickness: .48, bevelSize: .42, bevelSegments: 5, curveSegments: 24 });
        geometry.translate(-36, -18, -3);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(.1, -.1, .1);
        logo.add(mesh);
      }
    }
    scene.add(logo);
    resize();
    renderer.render(scene, camera);
    document.body.classList.add('webgl-ready');
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      document.body.classList.remove('webgl-ready');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { document.body.classList.add('webgl-ready'); tick(); });
    tick();
  } catch (error) {
    console.warn('Exibindo a versão vetorial da marca.', error.message);
    renderer?.domElement.remove();
    document.body.classList.remove('webgl-ready');
  }
}

function resize() {
  if (!renderer) return;
  const { width, height } = stage.getBoundingClientRect();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function tick() {
  animationFrame = requestAnimationFrame(tick);
  if (!isVisible || document.hidden || !logo) return;
  const aspect = camera.aspect;
  const fitScale = mobile() ? Math.min(1.2, aspect * 1.08) : Math.min(1.53, aspect * 1.55);
  const targetX = reduceMotion ? 0 : state.pointerX * .055;
  const targetY = reduceMotion ? 0 : state.pointerY * .04;
  logo.rotation.x = -.16 + state.turn * .2 + targetY;
  logo.rotation.y = -.34 + state.turn * .62 + targetX;
  logo.rotation.z = -.11 + state.turn * .17;
  logo.position.set(mobile() ? 0 : state.x, .35 + state.y, 0);
  logo.scale.setScalar(fitScale * state.size);
  fillUniform.value = state.fill;
  renderer.domElement.style.opacity = String(1 - state.fill * .48);
  renderer.render(scene, camera);
}

window.addEventListener('resize', resize, { passive: true });
window.addEventListener('pointermove', event => {
  state.pointerX += ((event.clientX / innerWidth - .5) * 2 - state.pointerX) * .16;
  state.pointerY += ((event.clientY / innerHeight - .5) * 2 - state.pointerY) * .16;
}, { passive: true });
new IntersectionObserver(entries => { isVisible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(document.querySelector('.dark-journey'));
createLogo();

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ full: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    if (context.conditions.full) {
      const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
      entrance.from('.hero h1 > span', { yPercent: 30, autoAlpha: 0, duration: 1.2, stagger: .12 }, .12);
      gsap.fromTo('.hero h1', { y: 0, autoAlpha: 1 }, { y: -110, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: .7 } });
      gsap.fromTo('.hero-top, .hero-bottom', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '65% top', scrub: .5 } });
      gsap.to(state, { turn: 1, size: 1.12, x: mobile() ? 0 : 1.7, y: .5, ease: 'none', scrollTrigger: { trigger: '.dark-journey', start: 'top top', end: 'bottom bottom', scrub: 1 } });
      gsap.to(state, { fill: 1, ease: 'none', scrollTrigger: { trigger: '.essence', start: '20% 70%', end: 'bottom 45%', scrub: 1 } });
      const heading = document.querySelector('.reveal-words');
      if (!heading.querySelector('.word')) heading.innerHTML = heading.innerHTML.split(/(<br\s*\/?\s*>)/i).map(part => /^<br/i.test(part) ? part : part.trim().split(/\s+/).map(word => `<span class="word">${word}</span>`).join(' ')).join('');
      gsap.from('.reveal-words .word', { opacity: .12, stagger: .12, ease: 'none', scrollTrigger: { trigger: heading, start: 'top 83%', end: 'bottom 42%', scrub: .6 } });
      gsap.from('.essence-note', { autoAlpha: 0, y: 25, scrollTrigger: { trigger: '.essence-note', start: 'top 90%', end: 'top 70%', scrub: .5 } });
      gsap.from('.manifesto-copy', { autoAlpha: 0, y: 45, ease: 'none', scrollTrigger: { trigger: '.manifesto-copy', start: 'top 95%', end: 'top 65%', scrub: .6 } });
    } else {
      ScrollTrigger.create({ trigger: '.essence', start: 'top center', end: 'bottom top', onUpdate: self => { state.fill = self.progress; } });
    }
  });
  ScrollTrigger.create({ trigger: 'body', start: 'top top', end: 'bottom bottom', onUpdate: self => { document.querySelector('.page-progress span').style.transform = `scaleX(${self.progress})`; } });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

const header = document.querySelector('.header');
const solutions = document.querySelector('.solutions');
function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 40);
  header.classList.toggle('light', solutions.getBoundingClientRect().top < 75);
  const colored = window.scrollY > window.innerHeight * 1.7;
  document.querySelector('.material-label').textContent = colored ? '02 — EM MOVIMENTO' : '01 — POTENCIAL';
}
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('#menu');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  menu.hidden = true;
  menu.inert = true;
  header.classList.remove('menu-open');
  document.body.classList.remove('menu-is-open');
  requestAnimationFrame(() => { ScrollTrigger?.refresh(); ScrollTrigger?.update(); });
}
menuButton.addEventListener('click', () => {
  if (menuButton.getAttribute('aria-expanded') === 'true') return closeMenu();
  menu.hidden = false;
  menu.inert = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Fechar menu');
  header.classList.add('menu-open');
  document.body.classList.add('menu-is-open');
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('hashchange', () => { ScrollTrigger?.refresh(); ScrollTrigger?.update(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { ScrollTrigger?.refresh(); ScrollTrigger?.update(); } });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
  if (event.key === 'Tab' && !menu.hidden) {
    const controls = [...header.querySelectorAll('a,button'), ...menu.querySelectorAll('a')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.querySelectorAll('.solution-list details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (detail.open) document.querySelectorAll('.solution-list details').forEach(other => { if (other !== detail) other.open = false; });
    ScrollTrigger?.refresh();
  });
});
