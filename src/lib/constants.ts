export const MAX_MESSAGE_LENGTH = 10000;
export const MIN_MESSAGE_LENGTH = 1;

// Input height limits
export const MIN_INPUT_HEIGHT = 40;
export const MAX_INPUT_HEIGHT = 200;

// File upload limits
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (increased for videos)
export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  // Audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  // Video
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
];
