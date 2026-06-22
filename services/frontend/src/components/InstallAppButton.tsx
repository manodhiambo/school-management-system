import { useState } from 'react';
import { Download, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg';
  label?: string;
}

export function InstallAppButton({ className, variant = 'outline', size = 'default', label = 'Download App' }: InstallAppButtonProps) {
  const { isStandalone, isIOS, canPromptNatively, promptInstall } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  if (isStandalone) return null;

  const handleClick = async () => {
    if (canPromptNatively) {
      await promptInstall();
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} className={className}>
        <Download className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent>
          <DialogClose onClick={() => setShowInstructions(false)} />
          <DialogHeader>
            <DialogTitle>Install Skul Manager</DialogTitle>
          </DialogHeader>
          {isIOS ? (
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Share className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                Tap the <strong>Share</strong> button in Safari's toolbar.
              </li>
              <li className="flex items-start gap-2">
                <PlusSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                Tap <strong>Add</strong> — Skul Manager will appear on your home screen like any other app.
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <MoreVertical className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                Open your browser's menu (or look for an install icon in the address bar).
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>).
              </li>
              <li className="text-gray-500">
                If you don't see this option, your browser may not support installing apps yet — Skul Manager still works fully in the browser.
              </li>
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
