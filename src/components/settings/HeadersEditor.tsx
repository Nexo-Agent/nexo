import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Header {
  key: string;
  value: string;
}

interface HeadersEditorProps {
  value?: string; // JSON string
  onChange: (value: string | undefined) => void;
}

export function HeadersEditor({ value, onChange }: HeadersEditorProps) {
  const [headers, setHeaders] = useState<Header[]>([]);

  // Parse JSON string to headers array
  useEffect(() => {
    if (value && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        const headersArray = Object.entries(parsed).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setHeaders(headersArray);
      } catch {
        // If invalid JSON, start with empty headers
        setHeaders([]);
      }
    } else {
      setHeaders([]);
    }
  }, [value]);

  // Convert headers array to JSON string
  const updateHeaders = (newHeaders: Header[]) => {
    setHeaders(newHeaders);
    const validHeaders = newHeaders.filter(
      (h) => h.key.trim() && h.value.trim()
    );
    if (validHeaders.length > 0) {
      const headersObj = validHeaders.reduce(
        (acc, { key, value }) => {
          acc[key.trim()] = value.trim();
          return acc;
        },
        {} as Record<string, string>
      );
      onChange(JSON.stringify(headersObj));
    } else {
      onChange(undefined);
    }
  };

  const handleAdd = () => {
    updateHeaders([...headers, { key: "", value: "" }]);
  };

  const handleRemove = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    updateHeaders(newHeaders);
  };

  const handleKeyChange = (index: number, key: string) => {
    const newHeaders = [...headers];
    newHeaders[index].key = key;
    updateHeaders(newHeaders);
  };

  const handleValueChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index].value = value;
    updateHeaders(newHeaders);
  };

  return (
    <div className="space-y-3">
      <Label>Headers (optional)</Label>

      {headers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Chưa có header nào
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
            className="h-9 w-9"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border p-3"
            >
              <div className="flex-1 grid grid-cols-2 gap-2 w-full">
                <div className="space-y-1 w-full">
                  <Label htmlFor={`header-key-${index}`} className="text-xs">
                    Key
                  </Label>
                  <Input
                    id={`header-key-${index}`}
                    value={header.key}
                    onChange={(e) => handleKeyChange(index, e.target.value)}
                    placeholder="Ví dụ: Authorization"
                    className="h-9 w-full"
                  />
                </div>
                <div className="space-y-1 w-full">
                  <Label htmlFor={`header-value-${index}`} className="text-xs">
                    Value
                  </Label>
                  <Input
                    id={`header-value-${index}`}
                    value={header.value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    placeholder="Ví dụ: Bearer token"
                    className="h-9 w-full"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="h-9 w-9 shrink-0"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
            className="h-9 w-full"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Headers chỉ áp dụng cho SSE và HTTP Streamable
      </p>
    </div>
  );
}

