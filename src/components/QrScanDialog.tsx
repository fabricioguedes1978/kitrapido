import { Scanner } from "@yudiel/react-qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function QrScanDialog({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResult: (text: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ler QR Code</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl">
          {open && (
            <Scanner
              onScan={(codes) => {
                const value = codes[0]?.rawValue;
                if (value) {
                  onOpenChange(false);
                  onResult(value);
                }
              }}
              onError={() => {}}
              constraints={{ facingMode: "environment" }}
              components={{ finder: true }}
            />
          )}
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Aponte a câmera para o QR Code do atleta ou da autorização.
        </p>
      </DialogContent>
    </Dialog>
  );
}
