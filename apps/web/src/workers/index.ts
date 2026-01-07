#!/usr/bin/env node

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.join(process.cwd(), 'apps/web/.env.local')
dotenv.config({ path: envPath })

type BullWorkerHandle = { close: () => Promise<void> }

let bullWorkers: BullWorkerHandle[] = []

const startWorkers = async () => {
  const [{ syncWorker }] = await Promise.all([import('./syncWorker')])

  if (syncWorker) {
    bullWorkers = [syncWorker]
  }
}

startWorkers().catch((error) => {
  console.error('[Workers] Failed to start:', error)
  process.exit(1)
})

const gracefulShutdown = async (signal: string) => {
  console.log(`[Workers] Received ${signal}, shutting down...`)

  try {
    await Promise.all(bullWorkers.map((worker) => worker.close()))
  } catch (error) {
    console.error('[Workers] Error during shutdown:', error)
  }

  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
