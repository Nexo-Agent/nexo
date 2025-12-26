import { Settings as SettingsIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LLMConnections } from "@/components/settings/LLMConnections";
import { MCPServerConnections } from "@/components/settings/MCPServerConnections";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Settings({ open, onOpenChange }: SettingsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-5" />
            Cài đặt
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="llm">LLM Connections</TabsTrigger>
            <TabsTrigger value="mcp">MCP Server Connections</TabsTrigger>
          </TabsList>
          <TabsContent value="llm" className="mt-4">
            <LLMConnections />
          </TabsContent>
          <TabsContent value="mcp" className="mt-4">
            <MCPServerConnections />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

