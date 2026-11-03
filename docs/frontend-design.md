# Frontend: plano de design

Este plano veio antes do código, seguindo o feedback do teste: definir identidade, layout,
hierarquia e estados de cada tela primeiro; depois construir.

## Referências e conceito

- **Galerias de museu (Uffizi)**: a obra ocupa a tela inteira na abertura, com o texto por cima;
  carrossel de exposições com setas; filetes coloridos separando as seções.
- **Casas de leilão tradicionais**: papel creme, faixas cor de vinho, blocos em grafite,
  serifa clássica e rótulos em versalete espaçado.

A Aurelia é uma **casa de leilões de arte**, não uma loja: a obra vem antes de tudo, e o
preço e o tempo aparecem com a sobriedade de um catálogo.

## Tipografia

| Uso | Fonte | Por quê |
|---|---|---|
| Títulos, obras e valores | Cormorant Garamond | Serifa clássica de alto contraste, tom de galeria |
| Rótulos e navegação | Montserrat em versalete espaçado | Contraste com a serifa, leitura fácil em tamanho pequeno |

## Cores

| Papel | Cor |
|---|---|
| Fundo | creme `#f4ede1`, cartões `#fbf7f0` |
| Marca, faixas e botão principal | vinho `#5c1a22` |
| Blocos escuros e rodapé | grafite `#211d1b` |
| Detalhes (filetes, números de lote, ícones) | dourado `#b08a4e` |

Estados: verde (você lidera), âmbar (você foi superado), vermelho (erro). Tema escuro com as mesmas regras.

## Galeria de cada obra

O museu tem uma foto por pintura. Cada lote ganha uma galeria com a **obra inteira e três
detalhes ampliados** (centro, inferior esquerdo, inferior direito), como um colecionador
examinaria a peça. Os detalhes são recortes em alta resolução feitos pelo servidor de imagens
do museu (IIIF), pedidos pela nossa API: `GET /lots/:id/image?v=0..3`. Cada recorte também
fica guardado no banco (`artwork_images`), então a galeria não depende do museu depois da
primeira visita.

## Hierarquia por tela

1. **Vitrine (`/`)**: barra escura com o próximo lote a encerrar → abertura em tela cheia com o
   lote mais disputado → faixa vinho de atalhos (em leilão, em breve, encerrados, como funciona,
   conta) → "Detalhes que contam a história" (recortes da obra em destaque) → carrossel
   "Em leilão agora" → bloco escuro "como funciona" → catálogo com abas e busca → citação.
2. **Sala do lote (`/lotes/:id`)**: galeria com setas, miniaturas, teclado e deslizar (esquerda);
   painel de lances (direita, fixo) na ordem **sua situação → preço → tempo → dar lance**.
   Abaixo: livro de lances (gráfico + tabela) e ficha da obra.
3. **Login**: citação sobre a confiança nos lances + formulário curto + contas de teste em um clique.
4. **Carteira / Meus lances / Meus lotes**: cabeçalho → números-resumo → lista (quem precisa de ação primeiro).
5. **Novo lote**: passo 1 (escolher obra) → passo 2 (valores e datas), com prévia do cartão.
6. **Auditoria**: veredito em destaque → cadeia de selos desenhada como corrente.
7. **Comprovante**: certificado com moldura dourada, pronto para imprimir.

## Estados (toda tela trata os quatro)

| Estado | Como aparece |
|---|---|
| Carregando | Esqueleto com o formato do conteúdo |
| Vazio | Mensagem curta + a próxima ação |
| Erro | Mensagem + botão "Tentar de novo" |
| Sucesso | Aviso discreto que some sozinho |

## Componentes compartilhados

`Layout`, `Logo`, `LotCard`, `Gallery`, `ArtImage`, `States` (`PageHeader`, `EmptyState`,
`ErrorState`, `Notice`, `LotNumber`), `Skeleton`, `Charts` (`TimeBar`, `BidChart`, `BalanceBar`).

## Fora do escopo agora

TypeScript e SSE (tempo real) ficam para depois; a estrutura atual (hooks + `api/client.js`)
já facilita as duas migrações.
