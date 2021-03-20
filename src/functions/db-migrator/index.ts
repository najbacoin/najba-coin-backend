import "reflect-metadata";
import { sql } from "slonik";
import { wrapLambdaHandler } from "@utils/lambda";
import {
  createEnvReader,
  Environment,
  Lambda,
  PostgresDbClientConfig,
  readPostgresDbConfig,
} from "@services/app";
import logger from "@utils/logger";
import { toSerializableError } from "@utils/errors";
import { createDbPool, createDbPoolCustom, CreateDbPoolSpec } from "@services/db/config";

export const handler = wrapLambdaHandler<{}, MigratorConfig>(
  Lambda.DbMigrator,
  readMigratorConfig,
  dbInitiatorHandler
);

async function dbInitiatorHandler({ appConfig }: { appConfig: MigratorConfig }) {
  await initDb(appConfig);
}

async function initDb(appConfig: MigratorConfig) {
  const readEnv = createEnvReader(process.env);
  const targetDb: string = readEnv.readOptionalString("TARGET_PGDATABASE", "najbacoin");
  const targetAppUsername = readEnv.readOptionalString("TARGET_PGUSER", "lambda-api");
  const targetMigrationsUsername = readEnv.readOptionalString(
    "TARGET_MIGRATIONS_PGUSER",
    "lambda-migrator"
  );
  const appSchemas = ["public"];

  logger.info("Running db migrator", { targetDb, targetUserName: targetAppUsername });

  const initDbPool = await createInitDbPool(appConfig);

  const doesDbExist = await initDbPool
    .query(
      sql`
          SELECT 1
          FROM pg_database
          WHERE datname = ${targetDb}
      `
    )
    .then(queryResponse => queryResponse.rows.length > 0);

  if (!doesDbExist) {
    logger.info("Create db", {});
    try {
      await initDbPool.query(sql`
        CREATE DATABASE ${sql.identifier([targetDb])}
        ENCODING "utf8" LC_COLLATE "en_US.UTF-8" LC_CTYPE "en_US.UTF-8";
      `);
    } catch (error) {
      logger.error("Creating Database error", { error, targetDb });
      throw error;
    }
  } else {
    logger.info("Database exists", { targetDb });
  }

  await initDbPool.end();

  const dbPool = await createInitDbPool({
    ...appConfig,
    db: {
      ...appConfig.db,
      database: targetDb,
    },
  });

  const doesReadWriteRoleExist = await dbPool
    .query(sql` SELECT 1 FROM pg_roles WHERE rolname = 'readwrite'`)
    .then(queryResponse => queryResponse.rows.length > 0);

  const doesAppUserExist = await dbPool
    .query(sql`SELECT 1 FROM pg_roles WHERE rolname = ${targetAppUsername}`)
    .then(queryResponse => queryResponse.rows.length > 0);
  const doesMigratorRoleExist = await dbPool
    .query(sql` SELECT 1 FROM pg_roles WHERE rolname = 'migrator'`)
    .then(queryResponse => queryResponse.rows.length > 0);

  const doesMigrationsUserExist = await dbPool
    .query(sql`SELECT 1 FROM pg_roles WHERE rolname = ${targetMigrationsUsername}`)
    .then(queryResponse => queryResponse.rows.length > 0);

  logger.info("Running db init", {
    targetDb,
    targetAppUsername,
    targetMigrationsUsername,
    doesReadWriteRoleExist,
    doesAppUserExist,
    doesMigrationsUserExist,
    doesMigratorRoleExist,
  });

  for (const schema of appSchemas) {
    logger.info(`Create ${schema} schema`);
    await dbPool.query(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier([schema])}`);
  }
  if (!doesReadWriteRoleExist) {
    logger.info("Create read write role", {});
    try {
      // Revoke privileges from 'public' role
      await dbPool.query(sql`REVOKE CREATE ON SCHEMA public FROM PUBLIC;`);
      await dbPool.query(sql`REVOKE ALL ON DATABASE ${sql.identifier([targetDb])} FROM PUBLIC;`);

      // Read/write app role
      await dbPool.query(sql`CREATE ROLE "readwrite";`);

      await dbPool.query(
        sql`GRANT CONNECT ON DATABASE ${sql.identifier([targetDb])} TO "readwrite";`
      );
    } catch (error) {
      logger.error("Creating read write role error", { error });
      await dbPool.query(sql`
          DROP ROLE IF EXISTS "readwrite";
      `);
      throw error;
    }
  } else {
    logger.info("Read write role exists");
  }

  if (!doesAppUserExist) {
    logger.info("Creating app user", {});
    try {
      await dbPool.query(sql`CREATE
      USER
      ${sql.identifier([targetAppUsername])};`);
      await dbPool.query(sql`GRANT "readwrite" TO ${sql.identifier([targetAppUsername])};`);
      await dbPool.query(sql`GRANT "rds_iam" TO ${sql.identifier([targetAppUsername])};`);
    } catch (error) {
      logger.info("Creating app user error", { error });
      throw error;
    }
  } else {
    logger.info("App user exists", { targetUserName: targetAppUsername });
  }

  if (!doesMigratorRoleExist) {
    logger.info("Creating migrator role", {});
    try {
      await dbPool.query(sql`CREATE ROLE "migrator";`);
      await dbPool.query(sql`GRANT ALL ON DATABASE ${sql.identifier([targetDb])} TO "migrator";`);
    } catch (error) {
      logger.info("Creating migrator role error", { error });
      throw error;
    }
  } else {
    logger.info("Migrator role exists");
  }

  if (!doesMigrationsUserExist) {
    logger.info("Creating migrations user", {});
    try {
      await dbPool.query(sql`CREATE USER ${sql.identifier([targetMigrationsUsername])};`);
      await dbPool.query(sql`GRANT "rds_iam" TO ${sql.identifier([targetMigrationsUsername])};`);
      await dbPool.query(sql`GRANT "migrator" TO ${sql.identifier([targetMigrationsUsername])};`);
    } catch (error) {
      logger.info("Creating migrations user error", { error });
      throw error;
    }
  } else {
    logger.info("Migrations user exists", { targetUserName: targetAppUsername });
  }

  logger.info(`Granting permissions for schemas`);
  for (const schema of appSchemas) {
    logger.info(`Grant permissions in ${schema} schema for readwrite`);
    await dbPool.query(sql`
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql.identifier([schema])}
        GRANT SELECT, INSERT, UPDATE, DELETE
        ON TABLES TO "readwrite";
    `);

    await dbPool.query(sql`
        GRANT USAGE ON ALL SEQUENCES IN SCHEMA ${sql.identifier([schema])} TO "readwrite";
    `);
    await dbPool.query(sql`
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql.identifier([schema])}
        GRANT USAGE ON SEQUENCES
        TO "readwrite";
    `);
    await dbPool.query(
      sql`GRANT USAGE, CREATE ON SCHEMA ${sql.identifier([schema])} TO "readwrite";`
    );
    await dbPool.query(sql`
        GRANT SELECT, INSERT , UPDATE, DELETE
        ON ALL TABLES IN SCHEMA ${sql.identifier([schema])}
        TO "readwrite";
    `);

    logger.info(`Grant permissions in ${schema} schema for migrator`);
    await dbPool.query(sql`GRANT ALL ON SCHEMA ${sql.identifier([schema])} TO "migrator";`);
  }

  logger.info("Migrate db", { env: appConfig.environment });
  await dbPool.end();
}

async function createInitDbPool(appConfig: CreateDbPoolSpec) {
  try {
    const db = await createDbPool(appConfig);
    await db.query(sql`SELECT 1;`);
    return db;
  } catch (error) {
    logger.info("error create db pool", { error, sE: toSerializableError(error) });

    if (
      (error.message || error.errorMessage).startsWith("password authentication failed for user")
    ) {
      logger.info("Password error, going to use default password");
      const tempDbPool = await createDbPoolCustom({
        ...appConfig,
        db: {
          ...appConfig.db,
          password: process.env.PGPASSWORD_INITIAL || "",
        },
        tls: true,
        dbIamAuth: false,
      });

      await tempDbPool
        .query(sql`GRANT "rds_iam" TO ${sql.identifier([appConfig.db.user])};`)
        .catch(err => {
          logger.error("Grant rds iam role error", err);
          throw err;
        });
      // await tempDbPool.query(
      //   sql`ALTER USER ${sql.identifier([appConfig.db.user])} WITH PASSWORD ${uuid()};`
      // );
      await tempDbPool.end();
      return await createDbPool(appConfig);
    } else {
      logger.error("Creating pool error", { error });
      throw error;
    }
  }
}

async function readMigratorConfig() {
  const { readRequiredString } = createEnvReader(process.env);

  return {
    environment: readRequiredString("ENVIRONMENT") as Environment,
    awsRegion: readRequiredString("AWS_REGION"),
    db: await readPostgresDbConfig(),
  } as MigratorConfig;
}

type MigratorConfig = {
  environment: Environment;

  awsRegion: string;

  db: PostgresDbClientConfig;
};
