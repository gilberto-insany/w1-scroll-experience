# W1 — Seu futuro em movimento

Estudo navegável da abertura e da narrativa de scroll, inspirado no ritmo editorial de landonorris.com e no posicionamento de w1.com.br. O SVG fornecido é a fonte do logo 3D.

## Abrir localmente

`python3 -m http.server 4184 --directory dist`

Acesse http://localhost:4184. Não é necessário instalar dependências nem executar build. Bibliotecas e fontes são servidas localmente.

## Interação

- Hero de uma altura de viewport, com logo preto extrudado e reflexos de estúdio, atrás do H1.
- O logo permanece no viewport ao longo da seção escura, aumenta, gira discretamente e recebe a cor da W1 de baixo para cima.
- Texto de apresentação revelado por palavras, seguido do manifesto, marquee e transição para a área clara de soluções.
- Menu, navegação interna, acordeões e links para o atendimento oficial funcionais.
- Layout adaptado para celular, tratamento de movimento reduzido e fallback SVG quando WebGL está indisponível.

## Implementação

Three.js 0.180: extrusão vetorial com bevel, material físico, ambiente de reflexos e shader de preenchimento. GSAP + ScrollTrigger: sincronização com scroll nativo. CSS: tipografia, transições e marquee.

`dist/app.js` contém o volume, reflexos, orientação e faixa de preenchimento. `dist/style.css` define a direção de arte e os layouts.

A seção de soluções é um estudo inicial. A proposta concentra o detalhamento na abertura e nas interações solicitadas. Textos adaptados do site oficial; não foram adicionadas métricas ou depoimentos.
