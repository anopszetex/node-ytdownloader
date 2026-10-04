const QUALITY_VALUES = new Set([720, 1080]);

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

/** @param {number} value */
export function validateQuality(value) {
  if (!QUALITY_VALUES.has(value)) {
    throw new TypeError("A qualidade deve ser 720 ou 1080.");
  }

  return /** @type {720 | 1080} */ (value);
}
