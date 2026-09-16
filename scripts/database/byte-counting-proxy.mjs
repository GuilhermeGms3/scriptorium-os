import { createServer, request } from "node:http";

const listenPort = Number(process.env.QA_PROXY_PORT ?? 4174);
const upstreamPort = Number(process.env.QA_UPSTREAM_PORT ?? 4173);

createServer((incoming, outgoing) => {
  const upstream = request(
    {
      hostname: "127.0.0.1",
      port: upstreamPort,
      method: incoming.method,
      path: incoming.url,
      headers: { ...incoming.headers, host: `127.0.0.1:${upstreamPort}` },
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.byteLength;
      });
      response.on("end", () => {
        console.log(
          JSON.stringify({
            method: incoming.method,
            path: incoming.url,
            status: response.statusCode,
            transferredBodyBytes: bytes,
          }),
        );
      });
      response.pipe(outgoing);
    },
  );
  upstream.on("error", (error) => {
    outgoing.writeHead(502, { "content-type": "text/plain" });
    outgoing.end(error.message);
  });
  incoming.pipe(upstream);
}).listen(listenPort, "127.0.0.1", () => {
  console.log(JSON.stringify({ listenPort, upstreamPort }));
});
