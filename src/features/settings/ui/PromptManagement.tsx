import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EmptyState } from '@/ui/atoms/empty-state';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Textarea } from '@/ui/atoms/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/atoms/tabs';
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
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { CommunityPromptsSection } from '@/features/prompt/ui/CommunityPromptsSection';
import { InstallPromptDialog } from '@/features/prompt/ui/InstallPromptDialog';
import type { HubPrompt } from '@/features/prompt/types';

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
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [promptToInstall, setPromptToInstall] = useState<HubPrompt | null>(
    null
  );

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
      if (!editingPrompt) {
        setActiveTab('installed');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      dispatch(showError(t('cannotSavePrompt')));
    }
  };

  const [activeTab, setActiveTab] = useState('installed');

  const handleInstallClick = (prompt: HubPrompt) => {
    setPromptToInstall(prompt);
    setInstallDialogOpen(true);
  };

  const handleInstalled = () => {
    loadPrompts();
    // Switch to installed tab
    setActiveTab('installed');
  };

  const installedPromptIds = prompts.map((p) => p.id);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">
            {t('installedPrompts', { defaultValue: 'Installed Prompts' })}
          </TabsTrigger>
          <TabsTrigger value="community">
            {t('communityPrompts', { defaultValue: 'Community Prompts' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('managePrompts')}
            </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    onClick={() => handleEdit(prompt)}
                    className="group relative rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    <div className="relative space-y-3">
                      {/* Header with icon and name */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                          <FileText className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-normal truncate">
                            {prompt.name}
                          </h4>
                        </div>
                      </div>

                      {/* Content preview */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {prompt.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="community" className="mt-6 space-y-4">
          <CommunityPromptsSection
            installedPromptIds={installedPromptIds}
            onInstall={handleInstallClick}
          />
        </TabsContent>
      </Tabs>

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

      <InstallPromptDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        prompt={promptToInstall}
        onInstalled={handleInstalled}
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
