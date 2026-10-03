# node-ytdownloader

CLI Node.js para baixar, com velocidade e qualidade, mídias de qualquer site
suportado pelo [`yt-dlp`](https://github.com/yt-dlp/yt-dlp).

O Node.js apenas controla o processo. Os bytes são gravados diretamente pelo
`yt-dlp`, sem cópias intermediárias e sem transcodificação. O FFmpeg é usado
somente quando vídeo e áudio precisam ser combinados.

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
ytdown "https://example.com/video"
```

Por padrão, a mídia é salva em `./downloads` com a melhor qualidade disponível.

```sh
ytdown <url> [options]

Opções:
  -o, --output <dir>       Pasta de destino
  -q, --quality <value>    best, 720, 1080, 1440 ou 2160
  -N, --connections <n>    Fragmentos simultâneos, de 1 a 32
      --ytdlp <path>       Caminho do executável yt-dlp
      --cookies-from-browser <browser>
                           Usa cookies de um navegador
      --cookies <file>     Usa um arquivo de cookies no formato Netscape
      --verbose            Exibe os logs técnicos do yt-dlp
  -h, --help               Exibe ajuda
  -v, --version            Exibe a versão
```

Exemplo:

```sh
ytdown "https://example.com/video" --output ~/Videos --quality 2160 --connections 16
```

Durante o download, a CLI apresenta título, percentual, velocidade e tempo
estimado em português. Em terminais interativos, a barra é atualizada na mesma
linha. Em pipelines e CI, o progresso é emitido em intervalos de 10% sem códigos
ANSI.

Os logs técnicos do `yt-dlp` ficam ocultos normalmente. Para investigar uma
falha, execute novamente com `--verbose`.

`--connections` acelera apenas mídias fragmentadas e depende dos limites do
servidor e da conexão. Mais conexões nem sempre significam mais velocidade.

### YouTube solicitando login

Se o YouTube responder com `Sign in to confirm you’re not a bot`, reutilize os
cookies de um navegador no qual você já esteja autenticado:

```sh
npm start -- "https://youtu.be/rWKE-mhpzOs?list=RDrWKE-mhpzOs" --cookies-from-browser chrome
```

Também funciona com o comando instalado:

```sh
ytdown "https://youtu.be/rWKE-mhpzOs" --cookies-from-browser firefox
```

Para um perfil específico, use a sintaxe aceita pelo `yt-dlp`, como
`chrome:Default`. Alternativamente, forneça um arquivo:

```sh
ytdown "<url>" --cookies ~/cookies.txt
```

Não adicione arquivos de cookies ao Git nem compartilhe esses arquivos. Eles
podem conceder acesso à sua conta.

## Desenvolvimento

```sh
npm run check
npm test
```

O `npm install` configura `.githooks/pre-commit`. Todo commit executa o Biome e
os testes nativos do Node.js. A skill local `code-review` está em
`.opencode/skills/code-review/SKILL.md` para revisões manuais e de pull requests.

## Arquitetura

```text
src/
├── cli/    # argumentos e ciclo de vida do processo
├── core/   # validação e regras puras
└── infra/  # filesystem e processo yt-dlp
```

Consulte `AGENTS.md` para as decisões e regras de engenharia.

## Uso responsável

Baixe apenas conteúdo para o qual você tenha autorização. Respeite direitos
autorais, termos do serviço e leis aplicáveis.
