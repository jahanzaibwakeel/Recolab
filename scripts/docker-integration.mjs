import { spawnSync } from "node:child_process";
import net from "node:net";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const dockerEnv = {
  ...process.env,
  POSTGRES_HOST_PORT: process.env.POSTGRES_HOST_PORT ?? "55432",
  VALKEY_HOST_PORT: process.env.VALKEY_HOST_PORT ?? "56379"
};
const testEnv = {
  ...dockerEnv,
  DATABASE_URL: process.env.DATABASE_URL ?? `postgres://recolab:recolab@127.0.0.1:${dockerEnv.POSTGRES_HOST_PORT}/recolab`,
  VALKEY_URL: process.env.VALKEY_URL ?? `redis://127.0.0.1:${dockerEnv.VALKEY_HOST_PORT}`,
  RUN_INTEGRATION_TESTS: "1"
};

function run(command, args, env = dockerEnv, options = {}) {
  const useShellCommand = isWindows && command.endsWith(".cmd");
  const result = useShellCommand
    ? spawnSync([command, ...args].join(" "), { stdio: "inherit", shell: true, env })
    : spawnSync(command, args, { stdio: "inherit", shell: false, env });
  if (result.error) {
    console.error(result.error.message);
  }
  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1);
  return result.status ?? 0;
}

async function waitForPort(port, label) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await canConnect(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} did not become reachable on port ${port}`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: Number(port), timeout: 1000 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

if (isWindows) {
  run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "docker compose up -d --force-recreate postgres valkey"], dockerEnv, { allowFailure: true });
} else {
  run("docker", ["compose", "up", "-d", "--force-recreate", "postgres", "valkey"], dockerEnv, { allowFailure: true });
}
console.log(`Waiting for PostgreSQL on ${dockerEnv.POSTGRES_HOST_PORT} and Valkey on ${dockerEnv.VALKEY_HOST_PORT}...`);
await waitForPort(dockerEnv.POSTGRES_HOST_PORT, "PostgreSQL");
await waitForPort(dockerEnv.VALKEY_HOST_PORT, "Valkey");
console.log("Docker services are reachable. Running migrations...");
run(npmCommand, ["run", "db:migrate"], testEnv);
console.log("Running integration tests...");
run(npmCommand, ["run", "test:integration"], testEnv);
