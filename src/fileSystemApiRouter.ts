import k from "kleur";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { decodeSearch, parseCookies, parseJsonSafe } from "./requestUtils";
import { ApiHandler, RequestInputs } from "./types";

type FileSystemApiRouterParams = {
  dir: string;
  pathnamePrefix: string;
};

type MatchedApiRoute = {
  filePath: string;
  pathname: string;
  handler: ApiHandler;
};

type FileSystemApiRouter = {
  match: (pathname: string) => MatchedApiRoute | undefined;
  list: () => string[];
  logRoutes: () => void;
};

export const createFileSystemApiRouter = async ({
  dir,
  pathnamePrefix,
}: FileSystemApiRouterParams): Promise<FileSystemApiRouter> => {
  const absoluteDir = resolve(dir);
  const absoluteModulesPaths = await getApiPaths(absoluteDir);

  const pathEntries = await Promise.all(
    absoluteModulesPaths.map<Promise<[string, MatchedApiRoute]>>(async modulePath => {
      const module = await import(modulePath);
      const handler = module.default as ApiHandler;

      const prefix = pathnamePrefix.startsWith("/") ? pathnamePrefix : `/${pathnamePrefix}`;

      const pathname = prefix + modulePath.replace(absoluteDir, "");

      return [
        pathname,
        {
          filePath: modulePath,
          pathname,
          handler,
        },
      ];
    }),
  );

  const paths = Object.fromEntries(pathEntries);

  return {
    match: (pathname: string): MatchedApiRoute | undefined => paths[pathname],
    list: () => Object.keys(paths),
    logRoutes: () => {
      console.log(k.yellow("Available File API routes:"));
      Object.keys(paths).forEach(route => {
        console.log(`- ${k.green(route)}`);
      });
    },
  };
};

export const createFileSystemApiRouterRequestHandler =
  (router: FileSystemApiRouter, publish: (channel: string, message: string) => number) =>
  async (request: Request): Promise<Response | undefined> => {
    const url = new URL(request.url);

    const matchedRoute = router.match(url.pathname);

    if (matchedRoute == null) {
      return undefined;
    }

    const contentType = request.headers.get("content-type");
    const cookies = parseCookies(request);
    const query = decodeSearch(url.searchParams);
    const body = contentType === "application/json" ? await parseJsonSafe(request) : null;

    const inputs: RequestInputs = {
      params: {},
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
      },
      status: output.status ?? 200,
    });
  };

const getApiPaths = async (rootFolder: string): Promise<string[]> => {
  const aggregatePaths = async (paths: string[], acc: string[] = []): Promise<string[]> => {
    const [path, ...rest] = paths;

    if (path == null) {
      return acc;
    }

    const pathStat = await stat(path);

    if (pathStat.isFile()) {
      const fileName = path.split("/").pop() ?? "";
      if (fileName.startsWith("_") || !fileName.endsWith(".ts")) {
        return aggregatePaths(rest, acc);
      }

      const modulePath = path.slice(0, -3); // remove .ts extension
      const pathToAdd = fileName === "index.ts" ? modulePath.slice(0, -6) : modulePath; // remove /index from path if it's an index file
      return aggregatePaths(rest, [...acc, pathToAdd]);
    }

    // if this is a folder, recursively get paths for all files in the folder
    const folderContent = await readdir(path);
    const contentPaths = folderContent.map(file => `${path}/${file}`);

    return aggregatePaths([...rest, ...contentPaths], acc);
  };

  return aggregatePaths([rootFolder]);
};
