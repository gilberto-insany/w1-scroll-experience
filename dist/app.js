import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => window.innerWidth <= 800;
const state = { light: 0, turn: 0, size: 1, x: .85, y: 0, alpha: 1, pointerX: 0, pointerY: 0 };
const pointer = { x: 0, y: 0 };
const introRoot = document.documentElement;
if (motionQuery.matches) introRoot.classList.remove('intro-pending');
const startsWithLogo = introRoot.classList.contains('intro-pending');
const arrival = { progress: startsWithLogo ? 0 : 1, reveal: startsWithLogo ? 0 : 1 };
let renderer, scene, camera, logo, animationFrame, greenSoftbox;
let isVisible = true;
const stage = document.getElementById('logo-stage');

async function loadSurfaceMaps() {
  const loader = new THREE.TextureLoader();
  const maps = await Promise.all(['color', 'normal', 'orm'].map(name => loader.loadAsync(`./assets/materials/matte-7037/${name}.webp`)));
  for (const map of maps) {
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    // ExtrudeGeometry UVs retain the SVG's original 72 × 36 coordinate space.
    map.repeat.set(1 / 48, 1 / 48);
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  }
  maps[0].colorSpace = THREE.SRGBColorSpace;
  return { color: maps[0], normal: maps[1], orm: maps[2] };
}

function renderDiamondIcons(surface) {
  // Bake four small previews with the same renderer and surface maps as the W.
  // They become ordinary images; no extra WebGL context or animation loop.
  const iconScene = new THREE.Scene();
  iconScene.environment = scene.environment;
  iconScene.environmentIntensity = .4;
  const iconCamera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, .1, 20);
  iconCamera.position.set(0, 0, 6);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-3, 4, 5);
  iconScene.add(key, new THREE.HemisphereLight(0xffffff, 0x102720, .45));
  const rim = new THREE.DirectionalLight(0xc9fff4, 1.2);
  rim.position.set(3, 1, -2);
  iconScene.add(rim);
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.05); shape.lineTo(.72, 0); shape.lineTo(0, -1.05); shape.lineTo(-.72, 0); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .26, steps: 1, bevelEnabled: true, bevelSize: .055, bevelThickness: .055, bevelSegments: 4 });
  geometry.translate(0, 0, -.13);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 24, uv.getY(i) * 24);
  geometry.setAttribute('uv1', uv.clone());
  const face = new THREE.MeshPhysicalMaterial({
    color: 0x32ddc9, specularColor: new THREE.Color(0x32ddc9),
    normalMap: surface?.normal ?? null, normalScale: new THREE.Vector2(.65, .65),
    aoMap: surface?.orm ?? null, aoMapIntensity: .35,
    roughnessMap: surface?.orm ?? null, roughness: surface ? 1 : .55,
    metalnessMap: surface?.orm ?? null, metalness: surface ? 1 : .15,
    clearcoat: .12, clearcoatRoughness: .4, envMapIntensity: .55
  });
  const edge = face.clone();
  edge.color.set(0x0f766b);
  edge.normalScale.set(.2, .2);
  edge.roughness = surface ? .72 : .3;
  edge.clearcoat = .45;
  edge.clearcoatRoughness = .2;
  edge.envMapIntensity = .9;
  const diamond = new THREE.Mesh(geometry, [face, edge]);
  iconScene.add(diamond);
  const poses = [[.25,-.4,-.22],[-.3,.5,.38],[.45,-.25,.75],[-.25,-.5,-.55]];
  const urls = [];
  renderer.setSize(192, 192, false);
  for (const pose of poses) {
    diamond.rotation.set(...pose);
    renderer.render(iconScene, iconCamera);
    urls.push(renderer.domElement.toDataURL('image/webp', .96));
  }
  document.querySelectorAll('.marquee-icon[data-diamond]').forEach(image => { image.src = urls[Number(image.dataset.diamond)]; });
  cases[1].image = urls[1];
  cases[2].image = urls[2];
  geometry.dispose();
  face.dispose(); edge.dispose();
}

function revealInterface() {
  introRoot.classList.remove('intro-pending');
  if (window.gsap) {
    window.gsap.fromTo('.header, .hero-top, .hero h1, .hero-bottom, .case-card-shell', { autoAlpha: 0 }, { autoAlpha: 1, duration: .55, stagger: .045, ease: 'power2.out', onComplete: () => window.ScrollTrigger?.refresh() });
  }
}

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
    scene.environment = pmrem.fromScene(room, .04).texture;
    scene.environmentIntensity = .28;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, .85);
    key.position.set(-4, 6, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb6bdb9, .6);
    rim.position.set(5, 2, -2);
    scene.add(rim);
    const lower = new THREE.DirectionalLight(0xd4d8d5, .3);
    lower.position.set(1, -5, 3);
    scene.add(lower);
    // A physical green strip light sweeps across the black metal as you scroll.
    // The material itself keeps its original graphite color throughout.
    RectAreaLightUniformsLib.init();
    greenSoftbox = new THREE.RectAreaLight(0x32ddc9, 22, 2.2, 6);
    scene.add(greenSoftbox);
    // The supplied 7037 painted-metal maps replace the procedural grain.
    // Keep the geometry interactive even if a texture request fails.
    let surface;
    try { surface = await loadSurfaceMaps(); }
    catch (error) { console.warn('Material indisponível; mantendo o acabamento preto.', error.message); }
    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: surface ? 0x686868 : 0x050706,
      map: surface?.color ?? null,
      normalMap: surface?.normal ?? null,
      normalScale: new THREE.Vector2(.65, .65),
      aoMap: surface?.orm ?? null, aoMapIntensity: .35,
      metalnessMap: surface?.orm ?? null, metalness: surface ? 1 : .15,
      roughnessMap: surface?.orm ?? null, roughness: surface ? 1 : .55,
      clearcoat: .12, clearcoatRoughness: .4, envMapIntensity: .55
    });
    const edgeMaterial = faceMaterial.clone();
    edgeMaterial.color.set(surface ? 0x8c8c8c : 0x0a100d);
    edgeMaterial.normalScale.set(.2, .2);
    edgeMaterial.roughness = surface ? .72 : .3;
    edgeMaterial.clearcoat = .45;
    edgeMaterial.clearcoatRoughness = .2;
    edgeMaterial.envMapIntensity = .9;
    // Keep the broad black face neutral; the bevel and side material carry
    // the colored rim. This avoids a bright green wash over the core.
    faceMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float neutralFinish = min(outgoingLight.r, min(outgoingLight.g, outgoingLight.b));
        outgoingLight = vec3(neutralFinish) + (outgoingLight - vec3(neutralFinish)) * 0.06;
        #include <opaque_fragment>
      `);
    };
    const material = [faceMaterial, edgeMaterial];
    const response = await fetch('./assets/w1.svg');
    if (!response.ok) throw new Error('Logo indisponível');
    const svg = new SVGLoader().parse(await response.text());
    logo = new THREE.Group();
    for (const path of svg.paths) {
      if (path.userData?.node?.nodeName !== 'path') continue;
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, steps: 1, bevelEnabled: true, bevelThickness: .48, bevelSize: .42, bevelSegments: 5, curveSegments: 24 });
        geometry.setAttribute('uv1', geometry.attributes.uv.clone());
        geometry.translate(-36, -18, -3);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(.1, -.1, .1);
        logo.add(mesh);
      }
    }
    scene.add(logo);
    try { renderDiamondIcons(surface); }
    catch (error) { console.warn('Mantendo os losangos vetoriais.', error.message); }
    resize();
    document.body.classList.add('webgl-ready');
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      document.body.classList.remove('webgl-ready');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { document.body.classList.add('webgl-ready'); tick(); });
    if (window.gsap && introRoot.classList.contains('intro-pending')) {
      const opening = window.gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      opening.to(arrival, { reveal: 1, duration: .25 }, 0)
        .to(arrival, { progress: 1, duration: 1.35 }, .15)
        .call(revealInterface);
    } else {
      arrival.progress = arrival.reveal = 1;
      introRoot.classList.remove('intro-pending');
    }
    tick();
  } catch (error) {
    introRoot.classList.remove('intro-pending');
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
  const fitScale = mobile() ? Math.min(1, camera.aspect * 1.06) : Math.min(1.065, camera.aspect * .907);
  const enter = reduced ? 1 : arrival.progress;
  const intro = 1 - enter;
  logo.rotation.set(-.16 + state.turn*.04 + state.pointerY*.08, -.34 - state.turn*.1 + state.pointerX*.12, -.11 + state.turn*.025);
  logo.position.set(mobile() ? 0 : state.x * enter, (.35 + state.y) * enter, 0);
  logo.scale.setScalar(fitScale * state.size * (1 + intro * .28));
  const progress = reduced ? .15 : state.light;
  const angle = -.85 + progress * Math.PI * 1.6;
  greenSoftbox.position.set(logo.position.x + Math.cos(angle) * 5.4, logo.position.y + Math.sin(angle) * 3.8, -.25);
  greenSoftbox.lookAt(logo.position.x, logo.position.y, 0);
  greenSoftbox.intensity = (18 + Math.sin(progress * Math.PI) * 12) * enter * enter;
  renderer.domElement.style.opacity = String(.78 * state.alpha * arrival.reveal);
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
    gsap.set(state, { light: 0, turn: 0, size: 1, x: .85, y: 0, alpha: 1 });
    if (context.conditions.full) {
      gsap.fromTo('.hero h1', { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '12% top', end: 'bottom 20%', scrub: .5 } });
      gsap.fromTo('.hero-top, .hero-bottom, .case-card-shell', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '70% top', scrub: .4 } });
      const journey = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.dark-journey', start: 'top top', end: 'bottom bottom', scrub: .8 } });
      journey.to(state, { light: 1, turn: 1, size: .95, x: 1.1, y: .7, duration: 1 }, 0)
        .to(state, { alpha: .22, duration: .25 }, .75);
      gsap.from('.manifesto-copy', { autoAlpha: 0, y: 30, ease: 'none', scrollTrigger: { trigger: '.manifesto-copy', start: 'top 93%', end: 'top 72%', scrub: .4 } });
    }
  });
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
const caseShell = document.querySelector('.case-card-shell');
const caseCard = caseShell.querySelector('.case-card');
const caseImage = caseCard.querySelector('img');
const caseCopy = caseCard.querySelector('.case-card-copy');
const caseVisual = caseCard.querySelector('.case-card-visual');
const caseDots = [...caseShell.querySelectorAll('.case-dot')];
const casePause = caseShell.querySelector('.case-pause');
const cases = [
  {
    name: 'Clínica Aurora · empresa fictícia', area: 'W1 BUSINESS',
    title: ['Crescer com um plano.', 'Não por acaso.'],
    heading: ['Da rotina financeira', 'ao próximo capítulo.'],
    image: './assets/case-preview.svg', imageAlt: 'Estudo visual de crescimento',
    steps: [
      ['Vontade de expandir.', 'Uma clínica em crescimento precisa organizar o caixa antes de dar o próximo passo e abrir uma nova unidade.'],
      ['Clareza para decidir.', 'Um cenário de planejamento reúne custos, reservas e metas para avaliar o momento e o tamanho da expansão.'],
      ['Um plano para crescer.', 'A simulação mostra como decisões financeiras podem se conectar aos objetivos do negócio.']
    ]
  },
  {
    name: 'Família Horizonte · família fictícia', area: 'PLANEJAMENTO PATRIMONIAL',
    title: ['Um patrimônio.', 'Muitas gerações.'],
    heading: ['Cuidar do presente.', 'Planejar a continuidade.'],
    image: './assets/marquee-diamond-2.svg', imageAlt: 'Losango verde tridimensional com acabamento fosco',
    steps: [
      ['Uma história construída.', 'Uma família quer reunir sua visão de patrimônio e começar a conversar sobre continuidade.'],
      ['Objetivos compartilhados.', 'O cenário ilustrativo organiza prioridades, compromissos e perguntas para um planejamento familiar.'],
      ['Um olhar para o futuro.', 'A simulação conecta decisões do presente aos planos das próximas gerações.']
    ]
  },
  {
    name: 'Estúdio Soma · empresa fictícia', area: 'W1 BUSINESS',
    title: ['Mais clareza no caixa.', 'Espaço para criar.'],
    heading: ['Organizar as finanças.', 'Abrir possibilidades.'],
    image: './assets/marquee-diamond-3.svg', imageAlt: 'Losango verde tridimensional com acabamento fosco',
    steps: [
      ['Novos projetos chegando.', 'Um estúdio criativo precisa conciliar prazos de recebimento e despesas recorrentes.'],
      ['Visibilidade para escolher.', 'O cenário ilustrativo reúne calendário financeiro, prioridades e uma reserva planejada.'],
      ['Próximos passos conscientes.', 'A simulação demonstra uma forma de avaliar novos projetos com uma visão mais clara do caixa.']
    ]
  }
];
let activeCase = 0, caseTimer, caseInView = true, caseHovered = false, casePaused = false;
let caseTransition;
function setLines(element, lines) {
  element.replaceChildren(...lines.flatMap((line, index) => index ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
}
function scheduleCase() {
  clearTimeout(caseTimer);
  if (motionQuery.matches || casePaused || caseHovered || !caseInView || document.hidden || caseDialog.open || caseShell.contains(document.activeElement)) return;
  caseTimer = setTimeout(() => selectCase((activeCase + 1) % cases.length), 6500);
}
function selectCase(index) {
  caseTransition?.kill();
  activeCase = index;
  const update = () => {
    const item = cases[activeCase];
    caseImage.src = item.image;
    caseImage.alt = item.imageAlt;
    caseVisual.classList.toggle('is-object', activeCase !== 0);
    setLines(caseCard.querySelector('.case-card-title'), item.title);
    caseDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeCase);
      dot.setAttribute('aria-pressed', String(i === activeCase));
    });
  };
  if (gsap && !motionQuery.matches) {
    caseTransition = gsap.timeline().to([caseVisual, caseCopy], { opacity: 0, y: -4, duration: .18, ease: 'power1.in' })
      .call(update).fromTo([caseVisual, caseCopy], { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: .38, ease: 'power2.out', immediateRender: false });
  } else update();
  scheduleCase();
}
caseDots.forEach(dot => dot.addEventListener('click', () => selectCase(Number(dot.dataset.case))));
casePause.addEventListener('click', () => {
  casePaused = !casePaused;
  casePause.setAttribute('aria-pressed', String(casePaused));
  casePause.setAttribute('aria-label', casePaused ? 'Retomar alternância' : 'Pausar alternância');
  casePause.querySelector('span').textContent = casePaused ? '▷' : 'Ⅱ';
  scheduleCase();
});
caseShell.addEventListener('pointerenter', () => { caseHovered = true; scheduleCase(); });
caseShell.addEventListener('pointerleave', () => { caseHovered = false; scheduleCase(); });
caseShell.addEventListener('focusin', scheduleCase);
caseShell.addEventListener('focusout', () => requestAnimationFrame(scheduleCase));
document.addEventListener('visibilitychange', scheduleCase);
motionQuery.addEventListener('change', () => { casePause.hidden = motionQuery.matches; scheduleCase(); });
casePause.hidden = motionQuery.matches;
new IntersectionObserver(([entry]) => { caseInView = entry.isIntersecting; scheduleCase(); }, { threshold: .5 }).observe(caseShell);
caseCard.addEventListener('click', () => {
  const item = cases[activeCase];
  caseDialog.querySelector('.eyebrow').textContent = item.area + ' / ESTUDO ILUSTRATIVO';
  setLines(caseDialog.querySelector('h2'), item.heading);
  caseDialog.querySelector('.case-intro').textContent = item.name;
  caseDialog.querySelectorAll('.case-steps>div').forEach((step, index) => {
    step.querySelector('h3').textContent = item.steps[index][0];
    step.querySelector('p').textContent = item.steps[index][1];
  });
  caseDialog.showModal();
  scheduleCase();
});
document.querySelector('.case-dialog-close').addEventListener('click', () => caseDialog.close());
caseDialog.addEventListener('close', scheduleCase);
caseDialog.addEventListener('click', event => {
  const rect = caseDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) caseDialog.close();
});
