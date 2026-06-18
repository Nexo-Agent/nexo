import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/app/hooks';
import { showError } from '@/features/notifications/state/notificationSlice';
import { logger } from '@/lib/logger';
import { FlowData } from '@/features/chat/types';
import {
  type InsertedSkill,
  buildSkillAttachmentMetadata,
} from '../lib/skillAttachment';

interface ProcessingResult {
  input: string;
  images: string[];
  metadata?: string;
}

interface UseChatSubmitProps {
  onSend: (content?: string, images?: string[], metadata?: string) => void;
  attachedFiles: File[];
  attachedFlow: FlowData | null;
  setInsertedSkill: (skill: InsertedSkill | null) => void;
  setFlow: (flow: FlowData | null) => void;
  handleFileUpload: (files: File[]) => void;
  input: string;
  insertedSkill: InsertedSkill | null;
}

function buildOutgoingMetadata(
  insertedSkill: InsertedSkill | null,
  attachedFlow: FlowData | null
): string | undefined {
  if (!insertedSkill && !attachedFlow) {
    return undefined;
  }

  if (attachedFlow) {
    const flowMeta = JSON.stringify({
      type: 'flow_attachment',
      flow: attachedFlow,
      timestamp: Date.now(),
      ...(insertedSkill
        ? {
            skillId: insertedSkill.skillId,
            skillName: insertedSkill.skillName,
            description: insertedSkill.description,
          }
        : {}),
    });
    return flowMeta;
  }

  return buildSkillAttachmentMetadata(insertedSkill);
}

export function useChatSubmit({
  onSend,
  attachedFiles,
  attachedFlow,
  setInsertedSkill,
  setFlow,
  handleFileUpload,
  input,
  insertedSkill,
}: UseChatSubmitProps) {
  const { t } = useTranslation('chat');
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processAttachments =
    useCallback(async (): Promise<ProcessingResult | null> => {
      const userText = input.trim();
      const metadata = buildOutgoingMetadata(insertedSkill, attachedFlow);

      if (!userText && attachedFiles.length === 0 && !metadata) {
        return null;
      }

      let images: string[] = [];
      if (attachedFiles.length > 0) {
        try {
          images = await Promise.all(
            attachedFiles.map((file) => {
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            })
          );
        } catch (error) {
          logger.error('Failed to process images', error);
          dispatch(showError(t('failedToProcessImages', { ns: 'chat' })));
          return null;
        }
      }

      return {
        input: userText,
        images,
        metadata,
      };
    }, [attachedFiles, attachedFlow, input, insertedSkill, dispatch, t]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const result = await processAttachments();
      if (result) {
        setInsertedSkill(null);
        setFlow(null);
        handleFileUpload([]);

        onSend(result.input, result.images, result.metadata);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    processAttachments,
    setInsertedSkill,
    setFlow,
    handleFileUpload,
    onSend,
  ]);

  return {
    handleSubmit,
    isSubmitting,
  };
}
