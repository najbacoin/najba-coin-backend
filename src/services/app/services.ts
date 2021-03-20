import { readAppConfig } from "./config";

export type AppServices = ReturnType<typeof buildServices>;
export const buildServices = () => {
  const appConfig = readAppConfig();

  return { appConfig };
};
