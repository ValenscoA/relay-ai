import { migrate } from "drizzle-orm/postgres-js/migrator";
import { requireDb } from ".";
await migrate(requireDb(), { migrationsFolder: "drizzle" });
console.info("Database migrations applied");
