import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import {
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/ui/atoms/skeleton';
import { useAddons } from '../hooks/useAddons';

const middleEllipsis = (str: string, maxLength: number = 50) => {
  if (str.length <= maxLength) return str;
  const mid = Math.floor(maxLength / 2);
  return str.slice(0, mid - 2) + '...' + str.slice(-(mid - 1));
};

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

const RuntimeCardSkeleton = () => (
  <div className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="space-y-3 mb-6">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

export default function AddonSettings() {
  const { t } = useTranslation('settings');

  const {
    addonConfig,
    pythonRuntimes,
    nodeRuntimes,
    isLoading,
    installingPython,
    installingNode,
    actions,
  } = useAddons();

  const latestPython = useMemo(() => {
    if (pythonRuntimes.length === 0) return null;
    return [...pythonRuntimes].sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    )[0];
  }, [pythonRuntimes]);

  const latestNode = useMemo(() => {
    if (nodeRuntimes.length === 0) return null;
    return [...nodeRuntimes].sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true })
    )[0];
  }, [nodeRuntimes]);

  const otherInstalledPythonCount = useMemo(() => {
    if (!latestPython) return 0;
    return pythonRuntimes.filter(
      (r) => r.installed && r.version !== latestPython.version
    ).length;
  }, [pythonRuntimes, latestPython]);

  const otherInstalledNodeCount = useMemo(() => {
    if (!latestNode) return 0;
    return nodeRuntimes.filter(
      (r) => r.installed && r.version !== latestNode.version
    ).length;
  }, [nodeRuntimes, latestNode]);

  const handleCleanupOtherPython = async () => {
    if (!latestPython) return;
    const others = pythonRuntimes.filter(
      (r) => r.installed && r.version !== latestPython.version
    );
    for (const r of others) {
      await actions.uninstallPython(r.version);
    }
  };

  const handleCleanupOtherNode = async () => {
    if (!latestNode) return;
    const others = nodeRuntimes.filter(
      (r) => r.installed && r.version !== latestNode.version
    );
    for (const r of others) {
      await actions.uninstallNode(r.version);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-semibold tracking-tight">
          {t('runtimeEnvironment')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {t('addonManagementDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Python Card */}
        {isLoading ? (
          <RuntimeCardSkeleton />
        ) : latestPython ? (
          <div className="group relative flex flex-col rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-300 border-border/60">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-brand-python/10 flex items-center justify-center border border-brand-python/20 group-hover:scale-110 transition-transform duration-300">
                  <PythonIcon className="size-6 text-brand-python" />
                </div>
                <div>
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    Python
                    {addonConfig && (
                      <span className="text-[10px] font-normal text-muted-foreground opacity-70">
                        (uv {addonConfig.addons.python.uv.version})
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    v{latestPython.version}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all duration-300',
                  latestPython.installed
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                )}
              >
                {latestPython.installed ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>{t('installed')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3.5" />
                    <span>{t('notInstalled')}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('pythonRuntimeDescription')}
              </p>

              {latestPython.installed && latestPython.path && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40 overflow-hidden">
                  <Info className="size-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-[10px] font-mono text-muted-foreground"
                    title={latestPython.path}
                  >
                    {middleEllipsis(latestPython.path)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3">
              <Button
                onClick={() => actions.installPython(latestPython.version)}
                disabled={installingPython !== null}
                className={cn(
                  'w-full h-11 transition-all duration-300',
                  latestPython.installed
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-brand-python hover:bg-brand-python/90 text-white shadow-lg shadow-brand-python/20'
                )}
              >
                {installingPython === latestPython.version ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    {t('installing')}
                  </>
                ) : latestPython.installed ? (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    {t('reinstall', { defaultValue: 'Cài lại' })}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 size-4" />
                    {t('install')}
                  </>
                )}
              </Button>

              {latestPython.installed && (
                <Button
                  onClick={() => actions.uninstallPython(latestPython.version)}
                  disabled={installingPython !== null}
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {t('uninstall')}
                </Button>
              )}

              {otherInstalledPythonCount > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <Button
                    onClick={handleCleanupOtherPython}
                    variant="link"
                    size="sm"
                    className="w-full h-auto p-0 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    {t('cleanupOldVersions', {
                      defaultValue: 'Dọn dẹp {{count}} phiên bản cũ khác',
                      count: otherInstalledPythonCount,
                    })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Node.js Card */}
        {isLoading ? (
          <RuntimeCardSkeleton />
        ) : latestNode ? (
          <div className="group relative flex flex-col rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-300 border-border/60">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-brand-node/10 flex items-center justify-center border border-brand-node/20 group-hover:scale-110 transition-transform duration-300">
                  <NodeIcon className="size-6 text-brand-node" />
                </div>
                <div>
                  <h4 className="font-semibold text-base">Node.js</h4>
                  <p className="text-xs text-muted-foreground font-mono">
                    v{latestNode.version}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all duration-300',
                  latestNode.installed
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                )}
              >
                {latestNode.installed ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>{t('installed')}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-3.5" />
                    <span>{t('notInstalled')}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('nodeRuntimeDescription')}
              </p>

              {latestNode.installed && latestNode.path && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40 overflow-hidden">
                  <Info className="size-3.5 text-muted-foreground shrink-0" />
                  <span
                    className="text-[10px] font-mono text-muted-foreground"
                    title={latestNode.path}
                  >
                    {middleEllipsis(latestNode.path)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-auto space-y-3">
              <Button
                onClick={() => actions.installNode(latestNode.version)}
                disabled={installingNode !== null}
                className={cn(
                  'w-full h-11 transition-all duration-300',
                  latestNode.installed
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-brand-node hover:bg-brand-node/90 text-white shadow-lg shadow-brand-node/20'
                )}
              >
                {installingNode === latestNode.version ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    {t('installing')}
                  </>
                ) : latestNode.installed ? (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    {t('reinstall', { defaultValue: 'Cài lại' })}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 size-4" />
                    {t('install')}
                  </>
                )}
              </Button>

              {latestNode.installed && (
                <Button
                  onClick={() => actions.uninstallNode(latestNode.version)}
                  disabled={installingNode !== null}
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  {t('uninstall')}
                </Button>
              )}

              {otherInstalledNodeCount > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <Button
                    onClick={handleCleanupOtherNode}
                    variant="link"
                    size="sm"
                    className="w-full h-auto p-0 text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    {t('cleanupOldVersions', {
                      defaultValue: 'Dọn dẹp {{count}} phiên bản cũ khác',
                      count: otherInstalledNodeCount,
                    })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
