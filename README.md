# W1 — Seu futuro em movimento

Proposta navegável com logo 3D em metal preto, iluminação verde vinculada ao scroll e direção editorial.

[Abrir a proposta](https://w1-future-in-motion.insany-team-1573.chatgpt.site)

## Rodar localmente

```sh
python3 -m http.server 4184 --directory dist
```

Acesse http://localhost:4184. Não há instalação de dependências nem build. Fontes, scripts e assets são locais.

## Revisão 03

- Hero de uma altura de viewport. Na entrada, o logo sólido original aparece maior no centro, diminui e gira suavemente até a composição final, mantendo a reação ao mouse.
- Uma luz retangular verde muda de posição conforme o scroll. O material permanece preto; a cor aparece como reflexão da iluminação.
- Passagem direta da abertura para o manifesto, seguida do marquee sem divisória superior.
- Grid editorial para a diagramação, com apenas alguns traços visuais pontuais. A malha de linhas verticais foi retirada.
- Fundo suave com verde discreto, iluminação no canto superior esquerdo e granulação fina de baixa intensidade em escala fixa de pixels.
- Header que se condensa em uma cápsula central flutuante: menu à esquerda, logo ao centro e contato à direita.
- Card no canto inferior direito da abertura, com um case ilustrativo em diálogo acessível.
- Layout responsivo, navegação interna, acordeões, links oficiais, movimento reduzido e fallback vetorial.

## Arquivos

- `dist/app.js`: geometria extrudada, material físico, softbox verde, mouse, scroll e navegação.
- `dist/layout.css`: direção de arte, composição responsiva e menu flutuante.
- `dist/style.css`: estilos base, soluções e rodapé.
- `dist/index.html`: conteúdo e marcação.

Three.js 0.180, GSAP 3.13 e ScrollTrigger estão em `dist/assets/vendor`. A iluminação retangular usa a biblioteca de uniformes LTC da própria Three.js. Public Sans e Three.js são distribuídas com suas licenças.

## Verificar sintaxe

```sh
node --check dist/app.js
```

A proposta usa o posicionamento de w1.com.br e referências de Lando Norris, Trionn, Onoera, Nudot e Active Theory. A Clínica Aurora é um case fictício para demonstrar a interface; não representa um cliente ou resultado real. A área de soluções é um estudo inicial.
