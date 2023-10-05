type Literal = string | number | boolean | null;
type Json = Literal | { [key: string]: Json } | Json[];

export type RequestInputs = {
  query: Record<string, string | string[]>;
  body: Json;
  cookies: Record<string, string>;
  headers: Headers;
  publish: (channel: string, message: string) => number;
};

export type HandlerOutput = {
  body: Json;
  status?: number;
  headers?: Record<string, string>;
};

export type ApiHandler = (request: RequestInputs) => HandlerOutput | Promise<HandlerOutput>;
