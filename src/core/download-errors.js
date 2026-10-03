const FAILURE_RULES = Object.freeze([
  {
    code: "RATE_LIMIT",
    pattern: /HTTP Error 429|Too Many Requests/i,
    message:
      "O site limitou temporariamente as requisições. Aguarde e tente novamente com menos conexões.",
  },
  {
    code: "AUTH_REQUIRED",
    pattern: /Sign in to confirm|login required|authentication required/i,
    message: "O site exige uma sessão autenticada para este download.",
  },
  {
    code: "UNSUPPORTED",
    pattern: /Unsupported URL/i,
    message: "A URL não é suportada pelo yt-dlp.",
  },
  {
    code: "UNAVAILABLE",
    pattern: /Video unavailable|This video is unavailable/i,
    message: "A mídia não está disponível.",
  },
  {
    code: "AUTH_REQUIRED",
    pattern: /Private video|members-only/i,
    message: "A mídia é privada ou exclusiva para membros.",
  },
  {
    code: "FORMAT_UNAVAILABLE",
    pattern: /Requested format is not available/i,
    message: "A qualidade solicitada não está disponível.",
  },
]);

/**
 * Convert technical yt-dlp output into one actionable Portuguese error.
 * @param {string} diagnostics
 * @param {number | null} exitCode
 */
export function classifyDownloadFailure(diagnostics, exitCode) {
  const failure = FAILURE_RULES.find((rule) => rule.pattern.test(diagnostics));

  if (failure) {
    return Object.freeze({ code: failure.code, message: failure.message });
  }

  const code = exitCode ?? "desconhecido";

  return Object.freeze({
    code: "EXIT_FAILED",
    message: `O yt-dlp não concluiu o download (código ${code}). Execute novamente com --verbose.`,
  });
}
