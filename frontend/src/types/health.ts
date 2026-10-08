export type HealthResponse = {
  status: string
  service: string
  version: string
  environment: string
}

export type ReadinessResponse = {
  status: string
  database?: string
  service?: string
  version?: string
  detail?: string
}
