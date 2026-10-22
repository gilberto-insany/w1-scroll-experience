# W1 — Seu futuro em movimento

Proposta navegável de uma experiência W1 com grid editorial, contorno 3D e fragmentação vinculada ao scroll.

[Abrir a proposta](https://w1-future-in-motion.insany-team-1573.chatgpt.site)

## Rodar localmente

```sh
python3 -m http.server 4184 --directory dist
```

Acesse http://localhost:4184. Não há instalação de dependências nem build. Fontes, scripts e assets são servidos localmente.

## Interação da revisão 02

- Hero de uma altura de viewport com logo menor, inicialmente formado por contornos com profundidade e reação suave ao mouse.
- No scroll, o objeto ganha corpo de metal preto, cresce discretamente e se separa em peças volumétricas independentes. A animação pode ser revertida ao subir a página.
- Passagem direta da abertura ao manifesto, sem a antiga seção intermediária.
- Grid de 12 colunas com linhas finas, adaptado para seis no celular. Textos de apoio têm uma área de leitura preservada.
- Fundo granulado, iluminação verde discreta e verde nos acentos da interface.
- Header compacto após o scroll: menu à esquerda, logo central e contato à direita.
- Card flutuante de cases com exemplo explicitamente fictício, aberto em um diálogo acessível.
- Marquee sem linha superior, seguido da área clara de soluções.
- Navegação interna, acordeões, links oficiais, tratamento de movimento reduzido e fallback vetorial.

## Arquivos principais

- `dist/app.js`: iluminação, mouse, animações e navegação.
- `dist/fragments.js`: contorno com espessura e recorte geométrico das peças do SVG original.
- `dist/layout.css`: grid, direção de arte, header e responsividade da revisão.
- `dist/style.css`: estilos base, soluções e rodapé.
- `dist/index.html`: conteúdo e marcação.

Three.js 0.180, GSAP 3.13 e ScrollTrigger são incluídos em `dist/assets/vendor`. Public Sans é distribuída com sua licença em `dist/assets/fonts`.

## Validar geometria

```sh
node --check dist/app.js
node --check dist/fragments.js
node --no-warnings --experimental-loader ./checks/three-loader.mjs checks/geometry.mjs
```

A verificação garante volume preservado no recorte de contornos convexos e côncavos, normais voltadas para fora e profundidade real no contorno.

A proposta usa o posicionamento de w1.com.br e referências visuais de Lando Norris, Trionn, Onoera e Nudot. O case da Clínica Aurora é uma simulação autorizada para a apresentação; não é um cliente ou resultado real. A seção de soluções continua como estudo inicial.
