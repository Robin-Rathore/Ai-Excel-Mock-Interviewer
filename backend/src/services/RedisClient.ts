import { createClient, type RedisClientType } from "redis"

export class RedisClient {
  private client: RedisClientType
  private isConnected = false

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    })

    this.client.on("error", (err) => {
      console.error("Redis Client Error:", err)
    })

    this.client.on("connect", () => {
      console.log("Connected to Redis")
      this.isConnected = true
    })

    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect()
    } catch (error) {
      console.error("Failed to connect to Redis:", error)
      // Fallback to in-memory storage if Redis is not available
      this.setupFallback()
    }
  }

  private fallbackStorage = new Map<string, any>()

  private setupFallback(): void {
    console.log("Using in-memory fallback storage")
    this.isConnected = false
  }

  async setSession(sessionId: string, data: any): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.setEx(`session:${sessionId}`, 3600, JSON.stringify(data))
      } else {
        this.fallbackStorage.set(`session:${sessionId}`, data)
      }
    } catch (error) {
      console.error("Error setting session:", error)
      this.fallbackStorage.set(`session:${sessionId}`, data)
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      if (this.isConnected) {
        const data = await this.client.get(`session:${sessionId}`)
        return data ? JSON.parse(data) : null
      } else {
        return this.fallbackStorage.get(`session:${sessionId}`) || null
      }
    } catch (error) {
      console.error("Error getting session:", error)
      return this.fallbackStorage.get(`session:${sessionId}`) || null
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.del(`session:${sessionId}`)
      } else {
        this.fallbackStorage.delete(`session:${sessionId}`)
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      this.fallbackStorage.delete(`session:${sessionId}`)
    }
  }

  async setCache(key: string, value: any, ttl = 3600): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.setEx(key, ttl, JSON.stringify(value))
      } else {
        this.fallbackStorage.set(key, value)
      }
    } catch (error) {
      console.error("Error setting cache:", error)
      this.fallbackStorage.set(key, value)
    }
  }

  async getCache(key: string): Promise<any> {
    try {
      if (this.isConnected) {
        const data = await this.client.get(key)
        return data ? JSON.parse(data) : null
      } else {
        return this.fallbackStorage.get(key) || null
      }
    } catch (error) {
      console.error("Error getting cache:", error)
      return this.fallbackStorage.get(key) || null
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect()
    }
  }
}
