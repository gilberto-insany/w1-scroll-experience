# W1 — Seu futuro em movimento

Proposta navegável com logo 3D em metal pintado preto fosco, iluminação verde vinculada ao scroll e direção editorial.

[Abrir a proposta](https://w1-future-in-motion.insany-team-1573.chatgpt.site)

## Rodar localmente

```sh
python3 -m http.server 4184 --directory dist
```

Acesse http://localhost:4184. O site usa HTML/JS estático. Fontes e scripts são locais. Os mapas licenciados precisam ser preparados uma vez antes de rodar a partir de um clone; sem eles, o logo mantém um material preto de fallback.

## Revisão 10

- A abertura mostra primeiro apenas o logo sobre preto. Ele diminui até a posição final e, depois, textos e navegação entram suavemente, sem contador ou indicador de progresso.
- O objeto usa o material Poliigon Metal Painted Matte 7037 fornecido pelo usuário: mapas reais de cor, normal, oclusão, metal e rugosidade. A superfície permanece preta com relevo fino; bevels e laterais recebem a luz verde.
- A iluminação usa a mesma cor da interface (`#32ddc9`) e percorre o perímetro no scroll. O miolo permanece predominantemente preto.
- Fundo preto puro, sem granulação nem iluminação de fundo. O degradê escuro que cobria o logo atrás do manifesto foi removido.
- W central ampliado em aproximadamente 12% na composição desktop, com faces mais escuras e transparência para se integrar ao fundo.
- Marquee com pequenos losangos em quatro rotações diferentes: faces predominantemente verdes e laterais mais escuras. Os previews usam os mesmos mapas de normal, rugosidade, metal e oclusão do W, com o pigmento alterado para o verde da interface. Um atlas de 192 vistas 3D é renderizado no mesmo contexto WebGL. A rotação acompanha o relógio do marquee, com oito voltas por passagem e fases diferentes entre as peças. O movimento respeita a preferência por movimento reduzido e só atualiza os ícones próximos à área visível.
- Tipografia editorial com entrelinhas mais fechadas, parágrafos de apoio maiores e compactos, medidas controladas e alguns apoios em caixa alta.
- Passagem direta da abertura para o manifesto, seguida do marquee sem divisória superior.
- Grid editorial para a diagramação, com apoios visuais discretos e sem numerações decorativas.
- Header que se condensa em uma barra central flutuante, com blur, sem borda e com cantos discretos: menu à esquerda, logo ao centro e CTA “conversar” à direita.
- Card horizontal preto translúcido no canto inferior direito, alinhado ao grid, com três cases fictícios. Alternância suave, seleção manual, pausa e diálogo correspondente a cada conteúdo. A alternância pausa com foco, hover, diálogo aberto ou card fora da tela.
- W sem interação com o mouse e sem rotação por arraste. A direção e o movimento do objeto são controlados apenas pela abertura e pelo scroll.
- Interface sem setas e com menos elementos decorativos.
- Layout responsivo, navegação interna, acordeões, links oficiais, movimento reduzido e fallback vetorial. A abertura tem uma saída de segurança caso os recursos não carreguem.

## Preparar o material

O ZIP Poliigon 7037 fornecido para este projeto permanece fora do repositório. Para preparar os três mapas de runtime em WebP, use Python com Pillow:

```sh
python3 scripts/prepare-material.py /caminho/para/material.zip
```

O script verifica o SHA-256 do pacote e gera mapas 1K em `dist/assets/materials/matte-7037/`. Os mapas são ignorados pelo Git e incluídos no pacote publicado do site. `dist/material-manifest.json` registra a origem e os hashes dos arquivos gerados. Cor usa sRGB; normal e os canais AO/roughness/metalness permanecem lineares. O mapa normal recebe intensidade reduzida, sem deformar a geometria.

## Arquivos

- `dist/app.js`: geometria extrudada, material físico, softbox verde, scroll e navegação.
- `dist/layout.css`: direção de arte, composição responsiva e menu flutuante.
- `dist/style.css`: estilos base, soluções e rodapé.
- `dist/typography.css`: entrelinhas, medidas de texto e hierarquia editorial.
- `dist/index.html`: conteúdo e marcação.
- `scripts/create-marquee-icons.mjs`: gera fallbacks vetoriais dos quatro losangos; os previews PBR com o acabamento real são renderizados no carregamento pelo app.
- `scripts/prepare-material.py`: prepara os mapas de runtime a partir do pacote licenciado, sem copiar os originais para o Git.
- `dist/material-manifest.json`: identifica o pacote e os mapas usados nesta versão.

Three.js 0.180, GSAP 3.13 e ScrollTrigger estão em `dist/assets/vendor`. A iluminação retangular usa a biblioteca de uniformes LTC da própria Three.js. Public Sans e Three.js são distribuídas com suas licenças.

## Verificar sintaxe

```sh
node --check dist/app.js
```

A proposta usa o posicionamento de w1.com.br e referências de Lando Norris, Trionn, Onoera, Nudot e Active Theory. Clínica Aurora, Família Horizonte e Estúdio Soma são cases fictícios para demonstrar a interface; não representam clientes ou resultados reais. A área de soluções é um estudo inicial.
