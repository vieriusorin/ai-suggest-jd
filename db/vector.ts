import { 
    customType
  } from 'drizzle-orm/pg-core';
  
// Define vector type for pgvector
export const vector = customType<{ data: number[]; driverData: string }>({
    dataType(config) {
        return `vector(${(config as { dimensions?: number })?.dimensions ?? 1536})`;
    },
    toDriver(val: number[]): string {
        return JSON.stringify(val);
    },
    fromDriver(val: string): number[] {
        return JSON.parse(val);
    },
});