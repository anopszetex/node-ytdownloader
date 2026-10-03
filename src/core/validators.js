const QUALITY_VALUES = new Set([720, 1080, 1440, 2160]);

/** @param {string} value */
export function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("URL must be valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("URL must use HTTP or HTTPS.");
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
    throw new TypeError("Quality must be best, 720, 1080, 1440, or 2160.");
  }
  return /** @type {720 | 1080 | 1440 | 2160} */ (quality);
}

/** @param {string} value */
export function validateConnections(value) {
  const connections = Number(value);
  if (!Number.isInteger(connections) || connections < 1 || connections > 32) {
    throw new TypeError("Connections must be an integer from 1 to 32.");
  }
  return connections;
}
