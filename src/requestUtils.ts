export const parseJsonSafe = async (request: Request): Promise<any> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// Copied from https://github.com/swan-io/chicane/blob/main/src/search.ts#L3C1-L21C3
export const decodeSearch = (params: URLSearchParams): Record<string, string | string[]> => {
  const output: Record<string, string | string[]> = {};

  for (const [key, value] of params) {
    const existing = output[key];

    if (existing != null) {
      output[key] = typeof existing === "string" ? [existing, value] : existing.concat(value);
    } else {
      output[key] = value;
    }
  }

  return output;
};
