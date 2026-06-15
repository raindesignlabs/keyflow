/**
 * Redis connection config for BullMQ.
 *
 * BullMQ accepts a plain { host, port, ... } object — it creates
 * its own ioredis-compatible connection internally.
 */
const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null, // Required by BullMQ
};

export default connection;
