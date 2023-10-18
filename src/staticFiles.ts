type StaticFilesParams = {
  dir: string;
  fallbackToIndex?: boolean;
};

export const handleStaticFiles =
  ({ dir, fallbackToIndex = false }: StaticFilesParams) =>
  async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);

    const staticFilePath = dir + url.pathname;
    const file = Bun.file(staticFilePath);
    if (await file.exists()) {
      return new Response(file);
    }

    if (fallbackToIndex) {
      const indexFile = Bun.file(dir + "/index.html");
      if (await indexFile.exists()) {
        return new Response(indexFile);
      }
    }
  };
