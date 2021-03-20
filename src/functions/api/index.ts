import serverless from "serverless-http";
import { APIGatewayProxyHandler } from "aws-lambda/trigger/api-gateway-proxy";

import { buildServices } from "@services/app";
import { buildRouter } from "src/router";

async function setupRouter() {
  const services = buildServices();

  return async () => {
    return buildRouter(services);
  };
}

const router = setupRouter();

export const handler: APIGatewayProxyHandler = async (event, context) => {
  return serverless(await (await router)())(event, context);
};
