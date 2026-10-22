import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { buildFragmentedLogo, buildStroke } from './fragments.js';

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => window.innerWidth <= 800;
const state = { body: 0, explode: 0, turn: 0, size: 1, x: 1, y: 0, alpha: 1, pointerX: 0, pointerY: 0 };
const pointer = { x: 0, y: 0 };
let renderer, scene, camera, logo, animationFrame, bodyMaterial, strokeMaterial, edgeMaterial, dustMaterial;
let pieces = [];
let isVisible = true;
const stage = document.getElementById('logo-stage');
const clamp = THREE.MathUtils.clamp;

async function createLogo() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.setClearColor(0x080909, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    stage.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 0, 14);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, .04).texture;
    scene.environmentIntensity = .8;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xf4f6f6, 2.1);
    key.position.set(-4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc2ccce, 2.2);
    rim.position.set(5, 2, -2);
    scene.add(rim);
    const lower = new THREE.DirectionalLight(0xe2e6e3, 1.1);
    lower.position.set(1, -5, 3);
    scene.add(lower);
    const greenBounce = new THREE.DirectionalLight(0x49c996, .42);
    greenBounce.position.set(-4, -1, 4);
    scene.add(greenBounce);
    bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x101315, metalness: .88, roughness: .28, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: 1.7, transparent: true, opacity: 0, depthWrite: false });
    strokeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9ba2a1, metalness: .9, roughness: .24, envMapIntensity: 2, transparent: true, opacity: .9 });
    edgeMaterial = new THREE.LineBasicMaterial({ color: 0x83908f, transparent: true, opacity: 0, depthWrite: false });
    const response = await fetch('./assets/w1.svg');
    if (!response.ok) throw new Error('Logo indisponível');
    const svg = new SVGLoader().parse(await response.text());
    const shapes = svg.paths.filter(path => path.userData?.node?.nodeName === 'path').flatMap(path => SVGLoader.createShapes(path));
    logo = new THREE.Group();
    logo.add(buildStroke(shapes, strokeMaterial));
    const fragmented = buildFragmentedLogo(shapes, bodyMaterial, edgeMaterial);
    pieces = fragmented.pieces;
    logo.add(fragmented.root);
    const dustPositions = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      dustPositions[i*3] = Math.sin(i*127.1) * 5.4;
      dustPositions[i*3+1] = Math.sin(i*311.7) * 3.2;
      dustPositions[i*3+2] = Math.sin(i*71.3) * 1.8;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustMaterial = new THREE.PointsMaterial({ color: 0x9ca9a7, size: .014, transparent: true, opacity: 0, depthWrite: false });
    logo.add(new THREE.Points(dustGeometry, dustMaterial));
    scene.add(logo);
    resize();
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
  const reduced = motionQuery.matches;
  state.pointerX += ((reduced ? 0 : pointer.x) - state.pointerX) * .055;
  state.pointerY += ((reduced ? 0 : pointer.y) - state.pointerY) * .055;
  const fitScale = mobile() ? Math.min(.8, camera.aspect * .9) : Math.min(.8, camera.aspect * .7);
  logo.rotation.set(-.15 + state.turn*.2 + state.pointerY*.1, -.28 + state.turn*.55 + state.pointerX*.13, -.085 + state.turn*.14);
  logo.position.set(mobile() ? 0 : state.x, .45 + state.y, 0);
  logo.scale.setScalar(fitScale * state.size);
  const explode = reduced ? 0 : state.explode;
  for (const piece of pieces) {
    const progress = clamp((explode - piece.delay) / (1 - piece.delay), 0, 1);
    const eased = progress * progress * (3 - 2*progress);
    piece.group.position.copy(piece.center).addScaledVector(piece.drift, eased);
    piece.group.rotation.set(piece.rotation.x*eased, piece.rotation.y*eased, piece.rotation.z*eased);
  }
  bodyMaterial.opacity = clamp(state.body * 1.35, 0, 1) * state.alpha;
  bodyMaterial.depthWrite = bodyMaterial.opacity > .98;
  strokeMaterial.opacity = (.88 - state.body*.2) * (1 - explode) * state.alpha;
  edgeMaterial.opacity = .32 * explode * state.alpha;
  dustMaterial.opacity = .4 * explode * state.alpha;
  renderer.render(scene, camera);
}

window.addEventListener('resize', resize, { passive: true });
window.addEventListener('pointermove', event => {
  pointer.x = (event.clientX / innerWidth - .5) * 2;
  pointer.y = (event.clientY / innerHeight - .5) * 2;
}, { passive: true });
window.addEventListener('pointerout', event => { if (!event.relatedTarget) pointer.x = pointer.y = 0; });
new IntersectionObserver(entries => { isVisible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(document.querySelector('.dark-journey'));
createLogo();

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ full: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    gsap.set(state, { body: 0, explode: 0, turn: 0, size: 1, x: 1, y: 0, alpha: 1 });
    if (context.conditions.full) {
      gsap.from('.hero h1 > span', { yPercent: 20, autoAlpha: 0, duration: 1.1, stagger: .1, ease: 'power3.out' });
      gsap.fromTo('.hero h1', { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '12% top', end: 'bottom 20%', scrub: .5 } });
      gsap.fromTo('.hero-top, .hero-bottom, .case-card', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '70% top', scrub: .4 } });
      const journey = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.dark-journey', start: 'top top', end: 'bottom bottom', scrub: .8 } });
      journey.to(state, { body: .94, size: 1.18, x: 1.7, y: .25, turn: .4, duration: .5 }, .03)
        .to(state, { explode: 1, size: 1.25, x: .6, y: 1.35, turn: 1, duration: .55 }, .4)
        .to(state, { alpha: .12, duration: .25 }, .78);
      gsap.from('.manifesto-copy', { autoAlpha: 0, y: 30, ease: 'none', scrollTrigger: { trigger: '.manifesto-copy', start: 'top 93%', end: 'top 72%', scrub: .4 } });
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

const caseDialog = document.getElementById('case-dialog');
document.querySelector('.case-card').addEventListener('click', () => caseDialog.showModal());
document.querySelector('.case-dialog-close').addEventListener('click', () => caseDialog.close());
caseDialog.addEventListener('click', event => {
  const rect = caseDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) caseDialog.close();
});
