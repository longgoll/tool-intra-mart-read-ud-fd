/**
 * Service to interact with the parse-zip web worker
 * Provides a Promise-based API for parsing ZIP files
 */

import type { ParsedUserDefinition } from '../types/user-definition.types';
import type { WorkerResponse } from '../../workers/parse-zip.worker';

export type ProgressCallback = (progress: {
  stage: 'unzipping' | 'parsing' | 'processing';
  current?: number;
  total?: number;
  percentage?: number;
}) => void;

/**
 * Parse ZIP file using Web Worker
 * Returns parsed data and supports progress callback
 */
export function parseZipFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<ParsedUserDefinition> {
  return new Promise((resolve, reject) => {
    // Create worker
    const worker = new Worker(
      new URL('../../workers/parse-zip.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'progress':
          if (onProgress) {
            const progress: Parameters<ProgressCallback>[0] = {
              stage: message.stage,
              current: message.current,
              total: message.total,
            };

            // Calculate percentage for processing stage
            if (message.stage === 'processing' && message.current && message.total) {
              progress.percentage = Math.round((message.current / message.total) * 100);
            }

            onProgress(progress);
          }
          break;

        case 'success':
          worker.terminate();
          resolve(message.data);
          break;

        case 'error':
          worker.terminate();
          reject(new Error(message.error));
          break;
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Send file to worker
    worker.postMessage({
      type: 'parse',
      file,
    });
  });
}
