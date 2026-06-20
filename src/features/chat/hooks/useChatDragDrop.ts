import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/app/hooks';
import { showError } from '@/features/notifications/state/notificationSlice';
import { MAX_FILE_SIZE } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils';
import type { ModelCapabilities } from '@/features/llm/lib/model-capabilities';
import {
  canAttachFiles,
  isFileAllowedForCapabilities,
} from '@/features/llm/lib/model-utils';

export interface UseChatDragDropProps {
  attachedFiles: File[];
  handleFileUpload: (files: File[]) => void;
  modelCapabilities: ModelCapabilities;
}

export function useChatDragDrop({
  attachedFiles,
  handleFileUpload,
  modelCapabilities,
}: UseChatDragDropProps) {
  const { t } = useTranslation('chat');
  const dispatch = useAppDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const supportsFileUpload = canAttachFiles(modelCapabilities);

  const validateAndAddFiles = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          dispatch(
            showError(
              t('fileTooLarge', {
                size: formatFileSize(file.size),
                max: formatFileSize(MAX_FILE_SIZE),
                ns: 'chat',
              })
            )
          );
          continue;
        }

        if (!isFileAllowedForCapabilities(file, modelCapabilities)) {
          dispatch(
            showError(
              t('fileTypeNotSupported', { type: file.type, ns: 'chat' })
            )
          );
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const newFiles = [...attachedFiles, ...validFiles];
        handleFileUpload(newFiles);
      }
    },
    [attachedFiles, dispatch, handleFileUpload, modelCapabilities, t]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!supportsFileUpload) return;
      setIsDragging(true);
    },
    [supportsFileUpload]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!supportsFileUpload) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        isFileAllowedForCapabilities(file, modelCapabilities)
      );

      if (files.length > 0) {
        validateAndAddFiles(files);
      }
    },
    [supportsFileUpload, modelCapabilities, validateAndAddFiles]
  );

  const handleDisplayPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!modelCapabilities.input.image) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        validateAndAddFiles(files);
      }
    },
    [modelCapabilities.input.image, validateAndAddFiles]
  );

  return {
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDisplayPaste,
  };
}
