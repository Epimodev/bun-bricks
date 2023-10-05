import k from "kleur";

export const logRequest = ({ method, url }: Request, { status }: Response, startTime: number) => {
  const time = Date.now() - startTime;
  const statusColor = status >= 500 ? k.red : status >= 400 ? k.yellow : k.green;
  const methodColor = (() => {
    switch (method) {
      case "GET":
        return k.cyan;
      case "POST":
        return k.green;
      case "PUT":
        return k.yellow;
      case "DELETE":
        return k.red;
      default:
        return k.white;
    }
  })();

  console.log(`${statusColor(status)} ${methodColor(method)} ${url} - ${time}ms`);
};
