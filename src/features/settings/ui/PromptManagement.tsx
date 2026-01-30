import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EmptyState } from '@/ui/atoms/empty-state';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Textarea } from '@/ui/atoms/textarea';

import { SectionHeader } from '@/ui/molecules/SectionHeader';
import { EntityCard } from '@/ui/molecules/EntityCard';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { logger } from '@/lib/logger';
import { ConfirmDialog } from '@/ui/molecules/ConfirmDialog';

interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export function PromptManagement() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPrompts = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await invokeCommand<Prompt[]>(TauriCommands.GET_PROMPTS);
      setPrompts(data);
    } catch (error) {
      logger.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const handleAdd = () => {
    setEditingPrompt(null);
    setDialogOpen(true);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!promptToDelete) return;

    try {
      await invokeCommand(TauriCommands.DELETE_PROMPT, { id: promptToDelete });
      await loadPrompts();
      setDeleteDialogOpen(false);
      setPromptToDelete(null);
      dispatch(showSuccess(t('promptDeleted'), t('promptDeletedDescription')));
    } catch (error) {
      logger.error('Error deleting prompt:', error);
      dispatch(showError(t('cannotDeletePrompt')));
    }
  };

  const handleSave = async (
    prompt: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      if (editingPrompt) {
        // Update existing prompt
        await invokeCommand(TauriCommands.UPDATE_PROMPT, {
          id: editingPrompt.id,
          name: prompt.name,
          content: prompt.content,
        });
      } else {
        // Create new prompt
        const id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await invokeCommand<Prompt>(TauriCommands.CREATE_PROMPT, {
          id,
          name: prompt.name,
          content: prompt.content,
        });
      }
      await loadPrompts();
      setDialogOpen(false);
      setEditingPrompt(null);
      dispatch(
        showSuccess(
          t('promptSaved'),
          editingPrompt ? t('promptUpdated') : t('newPromptCreated')
        )
      );
    } catch (error) {
      logger.error('Error saving prompt:', error);
      dispatch(showError(t('cannotSavePrompt')));
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <SectionHeader>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          {t('addPrompt')}
        </Button>
      </SectionHeader>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState icon={FileText} title={t('noPrompts')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {prompts.map((prompt) => (
            <EntityCard
              key={prompt.id}
              onClick={() => handleEdit(prompt)}
              icon={<FileText className="size-5 text-primary" />}
              title={prompt.name}
              description={prompt.content}
              className="h-full"
            />
          ))}
        </div>
      )}

      <PromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prompt={editingPrompt}
        onSave={handleSave}
        onDelete={
          editingPrompt
            ? () => {
                setPromptToDelete(editingPrompt.id);
                setDialogOpen(false);
                setDeleteDialogOpen(true);
              }
            : undefined
        }
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        promptName={prompts.find((p) => p.id === promptToDelete)?.name}
      />
    </div>
  );
}

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  onSave: (prompt: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>) => void;
  onDelete?: () => void;
}

function PromptDialog({
  open,
  onOpenChange,
  prompt,
  onSave,
  onDelete,
}: PromptDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const [name, setName] = useState(prompt?.name || '');
  const [content, setContent] = useState(prompt?.content || '');

  React.useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setContent(prompt.content);
    } else {
      setName('');
      setContent('');
    }
  }, [prompt, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && content.trim()) {
      onSave({
        name: name.trim(),
        content: content.trim(),
      });
      onOpenChange(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={prompt ? t('editPrompt') : t('addNewPrompt')}
      description={t('configurePrompt')}
      scrollable={false}
      footer={
        <div className="flex w-full gap-3">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="flex-1 h-10"
            >
              <Trash2 className="mr-2 size-4" />
              {t('delete', { ns: 'common' })}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-10"
            disabled={!name.trim() || !content.trim()}
          >
            {prompt ? t('save', { ns: 'common' }) : t('add', { ns: 'common' })}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-name">{t('promptName')}</Label>
          <Input
            id="prompt-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('promptNamePlaceholder')}
            className="w-full h-10"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2 w-full">
          <Label htmlFor="prompt-content">{t('promptContent')}</Label>
          <Textarea
            id="prompt-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('promptContentPlaceholder')}
            className="w-full h-[33vh]"
            required
          />
        </div>
      </div>
    </FormDialog>
  );
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  promptName?: string;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  promptName,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('deletePrompt')}
      description={`${t('confirmDeletePrompt')}${promptName ? ` ${promptName}` : ''}?`}
      onConfirm={onConfirm}
      confirmLabel={t('delete', { ns: 'common' })}
      cancelLabel={t('cancel', { ns: 'common' })}
      variant="destructive"
    />
  );
}
