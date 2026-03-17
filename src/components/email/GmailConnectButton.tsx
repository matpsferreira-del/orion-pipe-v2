import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, Unplug } from 'lucide-react';
import { useGmailConnection } from '@/hooks/useGmailConnection';

export function GmailConnectButton() {
  const { connected, gmailEmail, loading, startAuth, disconnect } = useGmailConnection();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Verificando conexão...</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
            <Mail className="h-3 w-3" />
            Conectado
          </Badge>
          <span className="text-sm text-muted-foreground truncate">{gmailEmail}</span>
        </div>
        <Button variant="outline" size="sm" onClick={disconnect}>
          <Unplug className="h-4 w-4 mr-1" />
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={startAuth} variant="outline">
      <Mail className="h-4 w-4 mr-2" />
      Conectar Gmail
    </Button>
  );
}
