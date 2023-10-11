import k from "kleur";
import { CorsOptions, corsToHeaders } from "./cors";
import { HttpMethod, decodeSearch, parseCookies, parseJsonSafe } from "./requestUtils";
import { ApiHandler, RequestInputs } from "./types";

/* ========================================================== */
/* https://github.com/swan-io/chicane/blob/main/src/types.ts */
export type NonEmptySplit<
  Value extends string,
  Separator extends string,
> = Value extends `${infer Head}${Separator}${infer Tail}`
  ? Head extends ""
    ? NonEmptySplit<Tail, Separator>
    : [Head, ...NonEmptySplit<Tail, Separator>]
  : Value extends ""
  ? []
  : [Value];

export type GetPathParams<Path extends string, Parts = NonEmptySplit<Path, "/">> = Parts extends [
  infer Head,
  ...infer Tail,
]
  ? Head extends `:${infer Name}`
    ? { [K in Name]: string } & GetPathParams<Path, Tail>
    : GetPathParams<Path, Tail>
  : {};
/* ========================================================= */

type ApiRouterConfig<Routes extends string> = {
  [Route in Routes]: Partial<Record<HttpMethod, ApiHandler<GetPathParams<Route>>>>;
};

type MatchedApiRoute = {
  params: Record<string, string>;
  handler: ApiHandler;
};

type ApiRouter = {
  match: (method: string, pathname: string) => MatchedApiRoute | undefined;
  logRoutes: () => void;
};

const isNonEmpty = (value: string): boolean => value !== "";
const isParam = (value: string): boolean => value.startsWith(":");

// From https://reach.tech/router/ranking
const extractRanking = (pathname: string) => {
  const parts = pathname.split("/").filter(isNonEmpty);

  let ranking = parts.length > 0 ? parts.length * 4 : 5;

  for (const part of parts) {
    const param = isParam(part);
    ranking += param ? 2 : 3;
  }

  return ranking;
};

const isMatchingRoute = (route: string, pathname: string): Record<string, string> | false => {
  const params: Record<string, string> = {};
  const routeParts = route.split("/").filter(isNonEmpty);
  const pathnameParts = pathname.split("/").filter(isNonEmpty);

  if (routeParts.length !== pathnameParts.length) {
    return false;
  }

  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathnamePart = pathnameParts[i];

    if (isParam(routePart)) {
      // remove the colon from the param name
      params[routePart.slice(1)] = decodeURIComponent(pathnamePart);
      continue;
    }

    if (routePart !== pathnamePart) {
      return false;
    }
  }

  return params;
};

export const createApiRouter = <Route extends string = string>(
  config: ApiRouterConfig<Route>,
): ApiRouter => {
  const sortedRoutes = Object.keys(config).sort(
    (a, b) => extractRanking(b) - extractRanking(a),
  ) as Route[];

  return {
    match: (method, pathname) => {
      for (const route of sortedRoutes) {
        const params = isMatchingRoute(route, pathname);

        if (params !== false) {
          return {
            params,
            handler: config[route][method as HttpMethod] as ApiHandler,
          };
        }
      }
    },
    logRoutes: () => {
      console.log(k.yellow("Available API routes:"));
      Object.keys(config).forEach(route => {
        // @ts-expect-error
        const methods: string[] = Object.keys(config[route]);
        methods.forEach(method => {
          console.log(`- ${k.cyan(method)} ${k.green(route)}`);
        });
      });
    },
  };
};

export const createApiRouterRequestHandler = (
  router: ApiRouter,
  cors: CorsOptions,
  publish: (channel: string, message: string) => number,
) => {
  const corsHeaders = corsToHeaders(cors);

  async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);

    const matchedRoute = router.match(request.method, url.pathname);

    if (matchedRoute == null) {
      return undefined;
    }

    const contentType = request.headers.get("content-type");
    const cookies = parseCookies(request);
    const query = decodeSearch(url.searchParams);
    const body = contentType === "application/json" ? await parseJsonSafe(request) : null;

    const inputs: RequestInputs = {
      params: matchedRoute.params,
      query,
      body,
      cookies,
      headers: request.headers,
      publish,
    };

    const output = await matchedRoute.handler(inputs);

    return new Response(JSON.stringify(output.body), {
      headers: {
        "content-type": "application/json",
        ...output.headers,
        ...corsHeaders,
      },
      status: output.status ?? 200,
    });
  };
};
