/**
 * Web Worker for parsing ZIP files in background
 * This prevents blocking the UI thread when processing large files
 */

import JSZip from 'jszip';
import type { ParsedUserDefinition, UserDefinition, UserDefinitionFile } from '../lib/types/user-definition.types';

export interface ParseZipMessage {
  type: 'parse';
  file: File;
}

export interface ParseProgressMessage {
  type: 'progress';
  stage: 'unzipping' | 'parsing' | 'processing';
  current?: number;
  total?: number;
}

export interface ParseSuccessMessage {
  type: 'success';
  data: ParsedUserDefinition;
}

export interface ParseErrorMessage {
  type: 'error';
  error: string;
}

export type WorkerResponse = ParseProgressMessage | ParseSuccessMessage | ParseErrorMessage;

self.onmessage = async (event: MessageEvent<ParseZipMessage>) => {
  const { type, file } = event.data;

  if (type !== 'parse') {
    postMessage({
      type: 'error',
      error: 'Unknown message type',
    } as ParseErrorMessage);
    return;
  }

  try {
    // Stage 1: Unzip file
    postMessage({
      type: 'progress',
      stage: 'unzipping',
    } as ParseProgressMessage);

    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Find user_definition.json
    const userDefFile = zipContent.file('user_definition.json');
    if (!userDefFile) {
      throw new Error('Không tìm thấy file user_definition.json trong file ZIP');
    }

    // Stage 2: Read and parse JSON
    postMessage({
      type: 'progress',
      stage: 'parsing',
    } as ParseProgressMessage);

    const content = await userDefFile.async('string');
    const data: UserDefinitionFile = JSON.parse(content);

    // Stage 3: Process definitions
    postMessage({
      type: 'progress',
      stage: 'processing',
      current: 0,
      total: data.userDefinitions.length,
    } as ParseProgressMessage);

    // Parse user definitions with progress updates
    const userDefinitions: UserDefinition[] = [];
    const batchSize = 50; // Process in batches to send progress updates

    for (let i = 0; i < data.userDefinitions.length; i += batchSize) {
      const batch = data.userDefinitions.slice(i, i + batchSize);

      for (const def of batch) {
        userDefinitions.push(JSON.parse(def));
      }

      // Send progress update
      postMessage({
        type: 'progress',
        stage: 'processing',
        current: userDefinitions.length,
        total: data.userDefinitions.length,
      } as ParseProgressMessage);
    }

    // Send success result
    postMessage({
      type: 'success',
      data: {
        userCategories: data.userCategories,
        userDefinitions,
      },
    } as ParseSuccessMessage);

  } catch (error) {
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    } as ParseErrorMessage);
  }
};

// Export empty object to make TypeScript happy
export {};
