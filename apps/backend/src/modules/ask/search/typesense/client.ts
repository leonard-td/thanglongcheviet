import Typesense, { type Client } from "typesense"

export type TypesenseConfig = {
  host: string
  port: number
  protocol: "http" | "https"
  apiKey: string
}

export function readTypesenseConfig(): TypesenseConfig {
  const host = process.env.TYPESENSE_HOST?.trim()
  const apiKey = process.env.TYPESENSE_API_KEY?.trim()
  if (!host || !apiKey) {
    throw new Error(
      "Typesense env missing: TYPESENSE_HOST and TYPESENSE_API_KEY required"
    )
  }
  const portRaw = process.env.TYPESENSE_PORT?.trim()
  const port = portRaw ? Number(portRaw) : 8108
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("TYPESENSE_PORT must be a positive number")
  }
  const protocol =
    process.env.TYPESENSE_PROTOCOL?.trim() === "https" ? "https" : "http"
  return { host, port, protocol, apiKey }
}

export function createTypesenseClient(
  config?: TypesenseConfig,
  opts?: { connectionTimeoutSeconds?: number }
): Client {
  const resolved = config ?? readTypesenseConfig()
  const hybridFlag = process.env.TYPESENSE_HYBRID?.trim().toLowerCase()
  const hybridOn =
    hybridFlag === "1" || hybridFlag === "true" || hybridFlag === "on"
  const timeout = opts?.connectionTimeoutSeconds ?? (hybridOn ? 15 : 3)
  return new Typesense.Client({
    nodes: [
      {
        host: resolved.host,
        port: resolved.port,
        protocol: resolved.protocol,
      },
    ],
    apiKey: resolved.apiKey,
    connectionTimeoutSeconds: timeout,
    numRetries: 1,
  })
}
