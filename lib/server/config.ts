import os from "node:os"
import path from "node:path"
import { getDataPath } from "@/lib/server-paths"
import { readJsonFile, mutateJsonFile } from "@/lib/services/blob-db"
import { getServerPaths } from "./paths"

const CONFIG_FILE = getDataPath(".local-server-mode-config.json")

export interface ServerModeConfig {
  mode: "server" | "client"
  serverName: string
  host: string
  port: number
  serverUrl?: string
  clientAccessToken?: string
  clientDeviceId?: string
  clientDeviceName?: string
  dataDirectory: string
  autoStart: boolean
  initialized: boolean
  adminConfigured: boolean
  startedAt?: string
}

export interface NetworkInterfaceInfo {
  name: string
  ip: string
  family: string
  mac: string
  internal: boolean
}

export interface ServerHostInfo {
  hostname: string
  platform: string
  ips: string[]
  primaryIp: string
  port: number
}

export const DEFAULT_SERVER_CONFIG: ServerModeConfig = {
  mode: "server",
  serverName: os.hostname() || "Sky Ariana Office Server",
  host: "0.0.0.0",
  port: 8000,
  serverUrl: "",
  dataDirectory: getServerPaths().root,
  autoStart: true,
  initialized: false,
  adminConfigured: false,
}

/**
 * Returns all active local network IPv4 addresses (LAN / Wi-Fi).
 */
export function getLocalNetworkAddresses(): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces()
  const results: NetworkInterfaceInfo[] = []

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === "IPv4") {
        results.push({
          name,
          ip: addr.address,
          family: addr.family,
          mac: addr.mac,
          internal: addr.internal,
        })
      }
    }
  }

  return results
}

/**
 * Resolves the primary LAN IP and server host info.
 */
export function getServerHostInfo(port = 8000): ServerHostInfo {
  const hostname = os.hostname() || "OFFICE-PC"
  const addresses = getLocalNetworkAddresses()
  const nonInternal = addresses.filter((a) => !a.internal && a.ip !== "127.0.0.1")

  // Prefer standard LAN subnets 192.168.x.x or 10.x.x.x
  const lanIps = nonInternal.map((a) => a.ip)
  const primaryIp = lanIps.find((ip) => ip.startsWith("192.168.") || ip.startsWith("10.")) || lanIps[0] || "127.0.0.1"

  return {
    hostname,
    platform: os.platform(),
    ips: lanIps.length > 0 ? lanIps : ["127.0.0.1"],
    primaryIp,
    port,
  }
}

/**
 * Reads the persistent server/client operating configuration.
 */
export async function getServerConfig(): Promise<ServerModeConfig> {
  try {
    const saved = await readJsonFile<Partial<ServerModeConfig>>(CONFIG_FILE, {})
    return {
      ...DEFAULT_SERVER_CONFIG,
      ...saved,
      dataDirectory: saved.dataDirectory || getServerPaths().root,
    }
  } catch {
    return { ...DEFAULT_SERVER_CONFIG }
  }
}

/**
 * Updates the server/client operating configuration atomically.
 */
export async function updateServerConfig(
  partial: Partial<ServerModeConfig>
): Promise<ServerModeConfig> {
  return mutateJsonFile<ServerModeConfig>(
    CONFIG_FILE,
    DEFAULT_SERVER_CONFIG,
    (current) => ({
      ...DEFAULT_SERVER_CONFIG,
      ...current,
      ...partial,
    })
  )
}
