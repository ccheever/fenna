import { getApiKey } from "./apiKey";

export interface RecraftConfig {
  model?: string;
  style?: string;
  size?: string;
}

export interface RecraftResult {
  svgContent: string;
  svgUrl: string;
}

const RECRAFT_API_URL = "https://external.api.recraft.ai/v1/images/generations";

/**
 * Generate an SVG image via Recraft V4 API.
 *
 * @param prompt - Text description of the art to generate
 * @param paletteHexColors - Optional hex colors to pass as color hints
 * @param config - Optional model/style/size overrides
 */
export async function generateSvg(
  prompt: string,
  paletteHexColors?: string[],
  config?: RecraftConfig
): Promise<RecraftResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No API key configured. Go to Settings to add your Recraft API key.");
  }

  const body: Record<string, unknown> = {
    prompt,
    model: config?.model || "recraftv4",
    style: config?.style || "vector_illustration",
    size: config?.size || "1024x1024",
    response_format: "url",
  };

  if (paletteHexColors && paletteHexColors.length > 0) {
    // Recraft accepts color hints as RGB arrays
    body.controls = {
      colors: paletteHexColors.slice(0, 5).map((hex) => {
        const h = hex.replace("#", "");
        return {
          rgb: [
            parseInt(h.substring(0, 2), 16),
            parseInt(h.substring(2, 4), 16),
            parseInt(h.substring(4, 6), 16),
          ],
        };
      }),
    };
  }

  // Try direct fetch first, fall back to proxy route if CORS blocked
  let data: { data: Array<{ url: string }> };

  try {
    const res = await fetch(RECRAFT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Recraft API error (${res.status}): ${err}`);
    }

    data = await res.json();
  } catch (e) {
    // If it looks like a CORS error, try the proxy
    if (e instanceof TypeError && e.message.includes("Failed to fetch")) {
      const proxyRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, ...body }),
      });

      if (!proxyRes.ok) {
        throw new Error(`Proxy API error (${proxyRes.status}): ${await proxyRes.text()}`);
      }

      data = await proxyRes.json();
    } else {
      throw e;
    }
  }

  if (!data.data || !data.data[0]?.url) {
    throw new Error("Unexpected API response: no URL returned");
  }

  const svgUrl = data.data[0].url;

  // Fetch the actual SVG content
  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) {
    throw new Error(`Failed to fetch SVG from ${svgUrl}`);
  }

  const svgContent = await svgRes.text();

  return { svgContent, svgUrl };
}

/**
 * Test the API key by making a minimal request.
 * Returns true if the key is valid.
 */
export async function testApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(RECRAFT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt: "test",
        model: "recraftv4",
        style: "vector_illustration",
        size: "1024x1024",
      }),
    });
    // 401/403 = bad key, anything else means the key is valid
    return res.status !== 401 && res.status !== 403;
  } catch {
    // Network error — can't verify but don't treat as invalid
    return true;
  }
}
