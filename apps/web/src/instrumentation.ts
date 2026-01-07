/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js when the server starts.
 * It initializes BullMQ workers for background job processing.
 */

export async function register() {
  // Only run on server-side Node.js (not edge, not client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Loading workers via Next.js instrumentation hook...')
    const workerRole = (process.env.WORKER_ROLE ?? 'all').toLowerCase()

    if (workerRole !== 'all' && workerRole !== 'worker') {
      console.log(`[Instrumentation] Skipping workers for role: ${workerRole}`)
      return
    }

    try {
      // Import workers - they register BullMQ processors on import
      await import('./workers/syncWorker')

      console.log('[Instrumentation] All workers loaded and ready')
    } catch (error) {
      console.error('[Instrumentation] Failed to load workers:', error)
      // Don't throw - allow Next.js to continue starting even if workers fail
    }
  }
}
