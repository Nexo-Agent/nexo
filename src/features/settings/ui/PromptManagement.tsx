import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EmptyState } from '@/ui/atoms/empty-state';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/store/hooks';
import { navigateToChat } from '@/store/slices/uiSlice';
import { showError, showSuccess } from '@/store/slices/notificationSlice';

// Types matching Rust structs
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

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await invokeCommand<Prompt[]>(TauriCommands.GET_PROMPTS);
      setPrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Error deleting prompt:', error);
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
      dispatch(navigateToChat());
    } catch (error) {
      console.error('Error saving prompt:', error);
      dispatch(showError(t('cannotSavePrompt')));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('managePrompts')}</p>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          {t('addPrompt')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState icon={FileText} title={t('noPrompts')} />
      ) : (
        <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
          <div className="space-y-2">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => handleEdit(prompt)}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{prompt.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {prompt.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {prompt ? t('editPrompt') : t('addNewPrompt')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t('configurePrompt')}
            </p>
          </DialogHeader>
          <DialogBody>
            <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
              <div className="space-y-4 pr-4">
                <div className="space-y-2 w-full">
                  <Label htmlFor="prompt-name">{t('promptName')}</Label>
                  <Input
                    id="prompt-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('promptNamePlaceholder')}
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2 w-full">
                  <Label htmlFor="prompt-content">{t('promptContent')}</Label>
                  <Textarea
                    id="prompt-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('promptContentPlaceholder')}
                    className="w-full min-h-[200px]"
                    required
                  />
                </div>
              </div>
            </ScrollArea>
          </DialogBody>
          <DialogFooter className="shrink-0 justify-between gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="flex-1"
              >
                <Trash2 className="mr-2 size-4" />
                {t('delete', { ns: 'common' })}
              </Button>
            )}
            <Button
              type="submit"
              disabled={!name.trim() || !content.trim()}
              className="flex-1"
            >
              {prompt
                ? t('save', { ns: 'common' })
                : t('add', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deletePrompt')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('confirmDeletePrompt')}
            {promptName && <span className="font-semibold"> {promptName}</span>}
            ?
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            {t('delete', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
