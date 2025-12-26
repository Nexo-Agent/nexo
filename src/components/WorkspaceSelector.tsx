import { useState } from "react";
import { ChevronDown, Plus, Settings as SettingsIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddWorkspaceDialog } from "@/components/AddWorkspaceDialog";
import { cn } from "@/lib/utils";

export interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  selectedWorkspace: Workspace;
  onWorkspaceChange: (workspace: Workspace) => void;
  onAddWorkspace: (name: string) => void;
  onWorkspaceSettings?: (workspace: Workspace) => void;
}

export function WorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onWorkspaceChange,
  onAddWorkspace,
  onWorkspaceSettings,
}: WorkspaceSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddClick = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto gap-2 px-3 py-2 hover:bg-accent"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
            {selectedWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{selectedWorkspace.name}</span>
        </div>
        <ChevronDown className="size-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => {
              onWorkspaceChange(workspace);
            }}
            className={cn(
              "cursor-pointer",
              selectedWorkspace.id === workspace.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded bg-primary text-xs font-medium text-primary-foreground">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <span>{workspace.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {onWorkspaceSettings && (
          <DropdownMenuItem
            onClick={() => {
              onWorkspaceSettings(selectedWorkspace);
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-4" />
              <span>Cài đặt workspace</span>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleAddClick}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <span>Thêm workspace</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AddWorkspaceDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onAddWorkspace={onAddWorkspace}
    />
    </>
  );
}

