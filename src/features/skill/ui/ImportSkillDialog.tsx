import * as React from 'react';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { Button } from '@/ui/atoms/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { useImportSkillMutation } from '../state/skillsApi';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface ImportSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSkillDialog({ isOpen, onClose }: ImportSkillDialogProps) {
  const [sourcePath, setSourcePath] = React.useState('');
  const [importSkill, { isLoading }] = useImportSkillMutation();

  const handleImport = async () => {
    if (!sourcePath.trim()) {
      toast.error('Please enter a source path');
      return;
    }

    try {
      await importSkill(sourcePath.trim()).unwrap();
      toast.success('Skill imported successfully');
      setSourcePath('');
      onClose();
    } catch (error) {
      logger.error('Failed to import skill:', error);
      toast.error('Failed to import skill');
    }
  };

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleImport} disabled={isLoading}>
        {isLoading ? 'Importing...' : 'Import Skill'}
      </Button>
    </>
  );

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Import Skill"
      description="Enter the local path to the skill directory containing a SKILL.md file."
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="sourcePath">Source Path</Label>
          <Input
            id="sourcePath"
            placeholder="/path/to/skill-directory"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The directory must contain a <strong>SKILL.md</strong> file with
          required metadata in YAML frontmatter.
        </p>
      </div>
    </FormDialog>
  );
}
