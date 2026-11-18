import { WebSocketMessage } from '../types';

type MessageHandler = (msg: WebSocketMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private currentAuctionId: string | null = null;
  private reconnectTimer: any = null;
  private isExplicitClose = false;

  public connect(auctionId?: string) {
    this.isExplicitClose = false;
    this.currentAuctionId = auctionId || null;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const path = auctionId ? `/ws/auctions/${auctionId}` : `/ws/live`;
    
    // In dev mode with Vite proxy or direct backend port 8000
    const url = `${protocol}//${host}${path}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[WS] Connected to ${path}`);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(data));
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitClose) {
          // Reconnect automatically
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            this.connect(this.currentAuctionId || undefined);
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Socket error:', err);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public disconnect() {
    this.isExplicitClose = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
