import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse as parseUrl } from 'url';

interface ParseRequest {
    userId: string;
    content: string;
}

interface ParseResponse {
    success: boolean;
    parsed: ParsedCommand | null;
    message: string;
}

interface ParsedCommand {
    command: string;
    direction?: string;
    target?: string;
}

interface Session {
    userId: string;
    startTime: number;
    state: 'active' | 'inactive';
}

export class LightServer {
    private server: any;
    private sessions: Map<string, Session>;
    private port: number;

    constructor(port: number = 3000) {
        this.port = port;
        this.sessions = new Map();
    }

    private handleCORS(res: ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    private async readBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
        });
    }

    private handleParse(req: IncomingMessage, res: ServerResponse) {
        this.readBody(req).then(body => {
            try {
                const { userId, content } = JSON.parse(body) as ParseRequest;
                console.log(`Received request from ${userId}:`, content);

                const response: ParseResponse = {
                    success: true,
                    parsed: null,
                    message: ''
                };

                if (content.toLowerCase().startsWith('look')) {
                    response.parsed = {
                        command: 'look'
                    };
                    response.message = 'You look around the room.';
                } else if (content.toLowerCase().startsWith('go ')) {
                    const direction = content.split(' ')[1];
                    response.parsed = {
                        command: 'move',
                        direction
                    };
                    response.message = `You move ${direction}.`;
                } else {
                    response.success = false;
                    response.message = 'Unknown command';
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Invalid request format' }));
            }
        });
    }

    start() {
        this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
            this.handleCORS(res);

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            const url = parseUrl(req.url || '');

            if (req.method === 'POST' && url.pathname === '/parse') {
                this.handleParse(req, res);
            } else if (req.method === 'GET' && url.pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Not found' }));
            }
        });

        this.server.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('Server stopped');
        }
    }
}

export default LightServer;