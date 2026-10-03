const QUALITY_VALUES = new Set([720, 1080, 1440, 2160]);

/** @param {string} value */
export function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("A URL deve ser válida.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("A URL deve usar HTTP ou HTTPS.");
  }
  return url.href;
}

/** @param {string} value */
export function validateQuality(value) {
  if (value === "best") {
    return value;
  }

  const quality = Number(value);
  if (!QUALITY_VALUES.has(quality)) {
    throw new TypeError("A qualidade deve ser best, 720, 1080, 1440 ou 2160.");
  }
  return /** @type {720 | 1080 | 1440 | 2160} */ (quality);
}

/** @param {string} value */
export function validateConnections(value) {
  const connections = Number(value);
  if (!Number.isInteger(connections) || connections < 1 || connections > 32) {
    throw new TypeError("O número de conexões deve ser um inteiro de 1 a 32.");
  }
  return connections;
}
