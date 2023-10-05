export type RequestHandler = (
  request: Request,
) => Response | undefined | Promise<Response | undefined>;

export const combineHandlers =
  (...handlers: RequestHandler[]): RequestHandler =>
  async request => {
    for (const handler of handlers) {
      const response = await handler(request);
      if (response != null) {
        return response;
      }
    }
  };
