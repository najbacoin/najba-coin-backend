import { buildServices, readAppConfig } from "@services/app";
import { createServer } from "http";
import { buildRouter } from "./router";

async function main() {
  const httpPort = 8083;
  const appConfig = await readAppConfig();

  const services = buildServices();
  const router = await buildRouter(services);

  const server = createServer(router);
  server.listen(httpPort, () => {
    console.log(`Server is running at http://localhost:${httpPort}`);
  });
  return Promise.resolve();
}

main()
  .then(() => console.log("Server running"))
  .catch(err => {
    console.error("Server failed", err);
    process.exit(1);
  });
