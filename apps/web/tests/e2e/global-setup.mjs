import { createServer } from "node:http";
import { createMockApiServer } from "./mock-api.mjs";

function listen(server, port) {
  return new Promise((resolve) => {
    server.listen(port, () => resolve());
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

export default async function globalSetup() {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4010";
  process.env.PORT = "3100";

  const mockApi = createMockApiServer();
  await listen(mockApi, 4010);

  const { default: next } = await import("next");
  const app = next({ dev: false, hostname: "0.0.0.0", port: 3100 });
  const handle = app.getRequestHandler();
  await app.prepare();

  const nextServer = createServer((req, res) => {
    handle(req, res);
  });
  await listen(nextServer, 3100);

  return async () => {
    await close(nextServer);
    await close(mockApi);
  };
}
