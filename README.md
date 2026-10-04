# node-ytdownloader

CLI interativa para baixar vídeos do YouTube, TikTok e outros sites suportados
pelo [`yt-dlp`](https://github.com/yt-dlp/yt-dlp).

O menu pede apenas a URL e a qualidade. O vídeo é salvo em MP4 dentro de
`./downloads`, com áudio quando a fonte possui áudio.

## Requisitos

- Node.js 22 ou superior
- `yt-dlp` disponível no `PATH`

No macOS:

```sh
brew install yt-dlp
```

## Instalação

```sh
npm install
npm link
```

## Uso

```sh
ytdown
```

O menu apresenta o fluxo:

```text
YTDOWN

URL do vídeo:
> https://example.com/video

Escolha a qualidade:
1. 1080p — recomendado
2. 720p
```

Antes de iniciar, a CLI mostra a qualidade e o destino para confirmação. URLs e
escolhas inválidas podem ser corrigidas no próprio menu.

Durante o download, a CLI apresenta título, percentual, velocidade e tempo
estimado. O resultado é sempre um arquivo MP4.

## Compatibilidade e qualidade

A primeira tentativa seleciona H.264 e AAC/M4A, codecs amplamente aceitos por
editores de vídeo. Quando a fonte já oferece esses codecs, o FFmpeg apenas
combina ou remuxa os streams, sem perda de qualidade.

Se essa combinação não existir, a CLI baixa o melhor vídeo disponível até a
resolução escolhida e converte para H.264 + AAC. A conversão é usada somente
como fallback porque exige mais processamento e pode causar uma pequena perda
de qualidade.

A CLI não aumenta artificialmente a resolução. Um vídeo disponível apenas em
480p continuará em 480p mesmo quando 1080p for escolhido.

Arquivos existentes não são sobrescritos. Downloads parciais podem ser
retomados pelo `yt-dlp` em uma execução posterior.

Para cancelar, pressione `Ctrl+C`. O download e qualquer processamento do
FFmpeg serão encerrados.

## Limites atuais

- baixa um vídeo por execução;
- oferece 720p e 1080p;
- salva sempre em `./downloads`;
- precisa ser executada em um terminal interativo;
- não oferece download de MP3 ou modo somente áudio.

Se o site exigir autenticação, a CLI pode pedir autorização para tentar
novamente com a sessão do Chrome. Os cookies são lidos diretamente pelo
`yt-dlp`; o Node.js não acessa nem armazena seu conteúdo. Recusar a autorização
encerra a tentativa sem acessar o navegador.

## Desenvolvimento

### Comandos de qualidade

| Comando | O que faz |
| --- | --- |
| `npm run format` | Formata os arquivos com o Biome. |
| `npm run lint` | Analisa o código com Biome e ESLint, sem alterá-lo. |
| `npm run check` | Confere formatação, lint e organização de imports. |
| `npm run check:fix` | Aplica correções seguras e organiza imports. |
| `npm test` | Executa os testes nativos do Node.js. |

Antes de entregar uma mudança, execute:

```sh
npm run check
npm test
```

### Biome e ESLint

O **Biome** é a ferramenta principal. Ele formata o código, organiza imports e
detecta problemas gerais, como:

- variáveis e imports não usados;
- `let` que pode ser `const`;
- blocos sem chaves;
- `else` desnecessário.

Por exemplo, `npm run lint` rejeita uma declaração não utilizada:

```js
const unusedUrl = "https://example.com";
```

Use a variável ou remova a declaração. O `check:fix` não a remove automaticamente,
pois isso poderia apagar código ou comentários importantes.

Correções seguras podem ser aplicadas automaticamente:

```js
// Antes
let destination = "downloads";

// Depois de npm run check:fix
const destination = "downloads";
```

O **ESLint** complementa o Biome somente nas regras estruturais: limita complexidade
e profundidade e impede `else`, `switch`, `do...while` e ternários aninhados. Isso
favorece funções pequenas e guard clauses:

```js
function validate(value) {
  if (!value) {
    throw new Error("Value is required.");
  }

  return value;
}
```

Formatar não substitui o lint: `npm run format` ajusta apenas a apresentação do
código, enquanto `npm run lint` encontra possíveis erros e problemas estruturais.

### Automação no editor e no Git

No VS Code, a extensão recomendada do Biome formata, aplica correções seguras e
organiza imports ao salvar arquivos JavaScript. As configurações compartilhadas
estão em `.vscode/`.

O `npm install` configura `.githooks/pre-commit`. Todo commit executa as validações
e os testes antes de ser criado. A skill local `code-review` está em
`.opencode/skills/code-review/SKILL.md` para revisões manuais e de pull requests.

## Arquitetura

```text
src/
├── cli/    # menu, apresentação e ciclo de vida do processo
├── core/   # validação e regras puras
└── infra/  # filesystem e processo yt-dlp
```

Consulte `AGENTS.md` para as decisões e regras de engenharia.

## Uso responsável

Baixe apenas conteúdo para o qual você tenha autorização. Respeite direitos
autorais, termos do serviço e leis aplicáveis.
