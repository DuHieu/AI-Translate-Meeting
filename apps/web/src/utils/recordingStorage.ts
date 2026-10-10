/**
 * IndexedDB helper for local client-side meeting recording persistence.
 * Zero-cloud storage: recordings are stored securely in browser storage.
 */

const DB_NAME = 'layameet_recordings_db';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

export interface StoredRecording {
  meetingCode: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface RecordingMetadata {
  meetingCode: string;
  size: number;
  createdAt: number;
  mimeType: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'meetingCode' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open recordings database.'));
  });
}

export async function saveRecording(meetingCode: string, blob: Blob): Promise<void> {
  if (!meetingCode || !blob) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredRecording = {
        meetingCode,
        blob,
        mimeType: blob.type || 'video/webm',
        size: blob.size,
        createdAt: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to save recording to IndexedDB.'));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[recordingStorage] saveRecording failed:', error);
  }
}

export async function getRecording(meetingCode: string): Promise<StoredRecording | null> {
  if (!meetingCode) return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(meetingCode);

      request.onsuccess = () => {
        resolve((request.result as StoredRecording) || null);
      };
      request.onerror = () => reject(request.error || new Error('Failed to read recording from IndexedDB.'));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[recordingStorage] getRecording failed:', error);
    return null;
  }
}

export async function deleteRecording(meetingCode: string): Promise<void> {
  if (!meetingCode) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(meetingCode);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete recording from IndexedDB.'));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[recordingStorage] deleteRecording failed:', error);
  }
}

export async function listRecordings(): Promise<RecordingMetadata[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as StoredRecording[]) || [];
        const metadata: RecordingMetadata[] = records.map((r) => ({
          meetingCode: r.meetingCode,
          size: r.size,
          createdAt: r.createdAt,
          mimeType: r.mimeType,
        }));
        resolve(metadata);
      };
      request.onerror = () => reject(request.error || new Error('Failed to list recordings from IndexedDB.'));
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.warn('[recordingStorage] listRecordings failed:', error);
    return [];
  }
}
