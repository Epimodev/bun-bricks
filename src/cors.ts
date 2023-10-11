import { RequestHandler } from ".";
import { HttpMethod } from "./requestUtils";

export type CorsOptions = Partial<{
  "Access-Control-Allow-Origin": string;
  "Access-Control-Allow-Methods": HttpMethod[];
  "Access-Control-Allow-Headers": string[];
  "Access-Control-Allow-Credentials": boolean;
}>;

export const corsToHeaders = (cors: CorsOptions): Record<string, string> => {
  return Object.fromEntries(Object.entries(cors).map(([key, value]) => [key, value.toString()]));
};

export const createCorsHandler =
  (cors: CorsOptions): RequestHandler =>
  request => {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsToHeaders(cors),
      });
    }
  };
