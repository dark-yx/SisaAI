import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/sisa_ai';

try {
  export const pool = new Pool({ connectionString: DATABASE_URL });
  export const db = drizzle({ client: pool, schema });
} catch (error) {
  console.warn('Database connection failed, using fallback configuration');
  // Create a mock database for development
  export const db = {} as any;
  export const pool = {} as any;
}