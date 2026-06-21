import React, { useMemo, useState } from 'react';
import { Search, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/atoms/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/ui/atoms/select';
import type { LLMConnection } from '@/app/types';

interface ModelSettingsProps {
  llmConnections: LLMConnection[];
  llmConnectionId: string | undefined;
  defaultModel: string;
  onModelChange: (connectionId: string | undefined, modelId: string) => void;
}

export function ModelSettings({
  llmConnections,
  llmConnectionId,
  defaultModel,
  onModelChange,
}: ModelSettingsProps) {
  const { t } = useTranslation(['settings']);
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const filteredLLMConnections = useMemo(() => {
    // First filter to only enabled connections
    const enabledConnections = llmConnections.filter((conn) => conn.enabled);

    if (!modelSearchTerm) return enabledConnections;

    return enabledConnections
      .map((conn) => ({
        ...conn,
        models: (conn.models || []).filter(
          (m) =>
            m.name?.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
        ),
      }))
      .filter((conn) => conn.models && conn.models.length > 0);
  }, [llmConnections, modelSearchTerm]);

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="default-model">{t('defaultModel')}</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{t('defaultModelDescription')}</TooltipContent>
        </Tooltip>
      </div>
      <Select
        value={
          llmConnectionId && defaultModel
            ? `${llmConnectionId}::${defaultModel}`
            : '__none__'
        }
        onValueChange={(value) => {
          if (value === '__none__') {
            onModelChange(undefined, '');
          } else {
            const [connId, ...modelIdParts] = value.split('::');
            const modelId = modelIdParts.join('::');
            onModelChange(connId, modelId);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setModelSearchTerm('');
          }
        }}
      >
        <SelectTrigger id="default-model" className="w-full" hideIcon={true}>
          <SelectValue placeholder={t('selectDefaultModel')}>
            {(() => {
              if (!llmConnectionId || !defaultModel) {
                return t('noDefaultModel');
              }
              const conn = llmConnections.find((c) => c.id === llmConnectionId);
              if (!conn) return t('noDefaultModel');
              const model = Array.isArray(conn.models)
                ? conn.models.find((m) => m?.id === defaultModel)
                : null;
              return (
                <span>
                  <span className="font-semibold mr-2 text-muted-foreground">
                    {conn.name}:
                  </span>
                  {model?.name || defaultModel}
                </span>
              );
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          hideScrollButtons={true}
          position="popper"
          sideOffset={5}
          className="max-h-[min(400px,var(--radix-select-content-available-height))]"
          header={
            llmConnections.length > 0 ? (
              <div
                className="p-2 bg-popover border-b"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchModels', { ns: 'settings' })}
                    value={modelSearchTerm}
                    onChange={(e) => setModelSearchTerm(e.target.value)}
                    className="pl-8 h-9 border-none shadow-none focus-visible:ring-0"
                    onKeyDown={(e: React.KeyboardEvent) => {
                      e.stopPropagation();
                    }}
                    autoFocus
                  />
                </div>
              </div>
            ) : null
          }
        >
          <SelectItem value="__none__">{t('noDefaultModel')}</SelectItem>
          {filteredLLMConnections.length === 0 && llmConnections.length > 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t('noModelsFound', {
                ns: 'settings',
                defaultValue: 'No models found',
              })}
            </div>
          ) : (
            filteredLLMConnections.map((conn, index) => {
              if (
                !conn.models ||
                !Array.isArray(conn.models) ||
                conn.models.length === 0
              ) {
                return null;
              }

              return (
                <React.Fragment key={conn.id}>
                  {index > 0 && <SelectSeparator className="my-1" />}
                  <SelectGroup>
                    <SelectLabel className="px-3 py-2 text-[10px] uppercase tracking-widest font-extrabold text-foreground bg-muted/40 border-y border-border/50 mt-1 mb-1 first:mt-0">
                      {conn.name} ({conn.provider})
                    </SelectLabel>
                    {conn.models.map((model) => {
                      if (!model || !model.id) return null;
                      return (
                        <SelectItem
                          key={`${conn.id}::${model.id}`}
                          value={`${conn.id}::${model.id}`}
                        >
                          {model.name || model.id}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </React.Fragment>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
