import { useTheme } from '@/hooks/use-theme';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          error:
            '!bg-red-50 !text-red-700 !border-red-200 dark:!bg-red-950/30 dark:!text-red-400 dark:!border-red-800/50',
          success:
            'group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border',
          warning:
            'group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border',
          info: 'group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
