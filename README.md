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

Options:
  -o, --output <dir>       Pasta de destino
  -q, --quality <value>    best, 720, 1080, 1440 ou 2160
  -N, --connections <n>    Fragmentos simultâneos, de 1 a 32
      --ytdlp <path>       Caminho do executável yt-dlp
  -h, --help               Exibe ajuda
  -v, --version            Exibe a versão
```

Exemplo:

```sh
ytdown "https://example.com/video" --output ~/Videos --quality 2160 --connections 16
```

`--connections` acelera apenas mídias fragmentadas e depende dos limites do
servidor e da conexão. Mais conexões nem sempre significam mais velocidade.

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
