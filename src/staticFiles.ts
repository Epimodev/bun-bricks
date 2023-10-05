export const handleStaticFiles =
  (dir: string) =>
  async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);

    const staticFilePath = dir + url.pathname;
    const file = Bun.file(staticFilePath);
    if (await file.exists()) {
      return new Response(file);
    }
  };
