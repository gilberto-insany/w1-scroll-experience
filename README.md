# W1 — Seu futuro em movimento

Proposta navegável com logo 3D em plástico metalizado preto, iluminação verde vinculada ao scroll e direção editorial.

[Abrir a proposta](https://w1-future-in-motion.insany-team-1573.chatgpt.site)

## Rodar localmente

```sh
python3 -m http.server 4184 --directory dist
```

Acesse http://localhost:4184. Não há instalação de dependências nem build. Fontes, scripts e assets são locais.

## Revisão 04

- A abertura mostra primeiro apenas o logo sobre preto. Ele diminui até a posição final e, depois, textos e navegação entram suavemente, sem contador ou indicador de progresso.
- O objeto tem faces pretas com microtextura discreta e acabamento de plástico metalizado; os bevels e as laterais recebem o destaque da luz.
- A iluminação usa a mesma cor da interface (`#32ddc9`) e percorre o perímetro no scroll. O miolo permanece predominantemente preto.
- Fundo preto puro, sem granulação nem iluminação de fundo.
- Tipografia editorial com entrelinhas mais fechadas, parágrafos de apoio maiores e compactos, medidas controladas e alguns apoios em caixa alta.
- Passagem direta da abertura para o manifesto, seguida do marquee sem divisória superior.
- Grid editorial para a diagramação, com apoios visuais discretos e sem numerações decorativas.
- Header que se condensa em uma barra central flutuante, com blur, sem borda e com cantos discretos: menu à esquerda, logo ao centro e CTA “conversar” à direita.
- Card preto translúcido no canto superior direito da abertura, com blur e case ilustrativo em diálogo acessível.
- Interface sem setas e com menos elementos decorativos.
- Layout responsivo, navegação interna, acordeões, links oficiais, movimento reduzido e fallback vetorial. A abertura tem uma saída de segurança caso os recursos não carreguem.

## Arquivos

- `dist/app.js`: geometria extrudada, material físico, softbox verde, mouse, scroll e navegação.
- `dist/layout.css`: direção de arte, composição responsiva e menu flutuante.
- `dist/style.css`: estilos base, soluções e rodapé.
- `dist/typography.css`: entrelinhas, medidas de texto e hierarquia editorial.
- `dist/index.html`: conteúdo e marcação.

Three.js 0.180, GSAP 3.13 e ScrollTrigger estão em `dist/assets/vendor`. A iluminação retangular usa a biblioteca de uniformes LTC da própria Three.js. Public Sans e Three.js são distribuídas com suas licenças.

## Verificar sintaxe

```sh
node --check dist/app.js
```

A proposta usa o posicionamento de w1.com.br e referências de Lando Norris, Trionn, Onoera, Nudot e Active Theory. A Clínica Aurora é um case fictício para demonstrar a interface; não representa um cliente ou resultado real. A área de soluções é um estudo inicial.
