import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Download, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/ui/atoms/tooltip';
import { useAddons } from '../hooks/useAddons';

const PythonIcon = ({ className }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <path d="M14.25.556a3.522 3.522 0 00-1.071.108c-1.134.331-1.78.966-1.841 2.585l-.01 1.253h5.72V5.41h-8.08c-2.458 0-4.04 1.354-4.385 3.332-.387 2.227.18 3.55 1.517 4.095 1.05.428 1.487.322 2.227.322h1.258v-1.761H6.42a1.442 1.442 0 01-1.396-1.545c0-1.033.72-1.545 2.126-1.545h6.666c1.284 0 2.227.81 2.227 2.054v4.542c0 1.244-.81 2.221-2.054 2.22h-6.703c-2.083 0-3.328-1.244-3.328-3.328v-1.258H.24c0 2.458 1.354 4.04 3.332 4.385 2.227.387 3.55-.18 4.095-1.517.428-1.05.322-1.487.322-2.227v-1.258h1.761v3.136c0 1.284.81 2.227 2.054 2.227h6.666c1.406 0 2.126.512 2.126 1.545 0 1.033-.72 1.545-2.126 1.545H8.77l.001 1.258c0 1.244.81 2.221 2.054 2.22h6.703c2.083 0 3.328-1.244 3.328-3.328v-4.542c0-2.084-1.245-3.328-3.328-3.328H11.53l.01-1.253c.061-1.619.707-2.254 1.841-2.585a3.522 3.522 0 011.071-.108c1.354 0 2.585.512 2.585 1.841v1.253h1.258c2.458 0 4.04-1.354 4.385-3.332.387-2.227-.18-3.55-1.517-4.095-1.05-.428-1.487-.322-2.227-.322H14.25zM9.11 3.235a1.144 1.144 0 011.143 1.143 1.144 1.144 0 01-1.143 1.143 1.144 1.144 0 01-1.143-1.143 1.144 1.144 0 011.143-1.143zm5.78 15.132a1.144 1.144 0 011.143 1.143 1.144 1.144 0 01-1.143 1.143 1.144 1.144 0 01-1.143-1.143 1.144 1.144 0 011.143-1.143z" />
  </svg>
);

const NodeIcon = ({ className }: { className?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
  >
    <path d="M12 0L2.14 5.71v12.58L12 24l9.86-5.71V5.71L12 0zm7.1 17.14l-7.1 4.1-7.1-4.1V6.86l7.1-4.1 7.1 4.1v10.28zM12 5.14L5.7 8.8v6.4l6.3 3.66 6.3-3.66V8.8L12 5.14z" />
  </svg>
);

export default function AddonSettings() {
  const { t } = useTranslation('settings');

  const {
    addonConfig,
    pythonRuntimes,
    nodeRuntimes,
    installingPython,
    installingNode,
    actions,
  } = useAddons();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('addonManagementDescription')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-brand-python">
          <PythonIcon className="size-4" />
          <h4 className="font-medium">{t('pythonRuntime')}</h4>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('pythonRuntimeDescription')}
          {addonConfig && (
            <span className="ml-1 text-xs opacity-70">
              (uv {addonConfig.addons.python.uv.version})
            </span>
          )}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pythonRuntimes.map((runtime) => (
            <div
              key={runtime.version}
              className="flex flex-col rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-brand-python/10 flex items-center justify-center shrink-0">
                  <PythonIcon className="size-5 text-brand-python" />
                </div>
                <div className="min-w-0">
                  {runtime.installed && runtime.path ? (
                    <Tooltip content={runtime.path}>
                      <h5 className="font-medium cursor-help">
                        Python {runtime.version}
                      </h5>
                    </Tooltip>
                  ) : (
                    <h5 className="font-medium">Python {runtime.version}</h5>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        runtime.installed
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {runtime.installed ? t('installed') : t('notInstalled')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-5 mb-4">
                {runtime.path ? (
                  <span
                    className="text-[10px] text-muted-foreground font-mono block truncate"
                    title={runtime.path}
                  >
                    {runtime.path}
                  </span>
                ) : (
                  <div className="h-full" />
                )}
              </div>

              <div className="mt-auto pt-2">
                {!runtime.installed ? (
                  <Button
                    onClick={() => actions.installPython(runtime.version)}
                    disabled={installingPython !== null}
                    size="sm"
                    className="w-full h-9 bg-brand-python hover:bg-brand-python/90 text-white"
                  >
                    {installingPython === runtime.version ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                        {t('installing')}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 size-4" />
                        {t('install')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => actions.uninstallPython(runtime.version)}
                    disabled={installingPython !== null}
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/20"
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('uninstall')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-brand-node">
          <NodeIcon className="size-4" />
          <h4 className="font-medium">{t('nodeRuntime')}</h4>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('nodeRuntimeDescription')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nodeRuntimes.map((runtime) => (
            <div
              key={runtime.version}
              className="flex flex-col rounded-lg border p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-brand-node/10 flex items-center justify-center shrink-0">
                  <NodeIcon className="size-5 text-brand-node" />
                </div>
                <div className="min-w-0">
                  {runtime.installed && runtime.path ? (
                    <Tooltip content={runtime.path}>
                      <h5 className="font-medium cursor-help">
                        Node.js {runtime.version}
                      </h5>
                    </Tooltip>
                  ) : (
                    <h5 className="font-medium">Node.js {runtime.version}</h5>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        runtime.installed
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {runtime.installed ? t('installed') : t('notInstalled')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-5 mb-4">
                {runtime.path ? (
                  <span
                    className="text-[10px] text-muted-foreground font-mono block truncate"
                    title={runtime.path}
                  >
                    {runtime.path}
                  </span>
                ) : (
                  <div className="h-full" />
                )}
              </div>

              <div className="mt-auto pt-2">
                {!runtime.installed ? (
                  <Button
                    onClick={() => actions.installNode(runtime.version)}
                    disabled={installingNode !== null}
                    size="sm"
                    className="w-full h-9 bg-brand-node hover:bg-brand-node/90 text-white"
                  >
                    {installingNode === runtime.version ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" />
                        {t('installing')}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 size-4" />
                        {t('install')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => actions.uninstallNode(runtime.version)}
                    disabled={installingNode !== null}
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/20"
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('uninstall')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
