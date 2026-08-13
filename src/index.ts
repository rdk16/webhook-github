import express, { Request, Response } from 'express';

const app = express();

app.use(express.json());

// Interfaces para tipagem do payload do GitHub (exemplo focado em Push)
interface GitHubRepository {
  full_name: string;
}

interface GitHubPusher {
  name: string;
}

interface GitHubCommit {
  id: string;
  message: string;
  url: string;
}

interface GitHubWebhookPayload {
  repository?: GitHubRepository;
  pusher?: GitHubPusher;
  commits?: GitHubCommit[];
}

// Tipagem estendida para o Request do Express
interface GitHubRequest extends Request {
  body: GitHubWebhookPayload;
  headers: {
    'x-github-event'?: string;
    [key: string]: string | string[] | undefined;
  };
}

app.post('/api/webhook', async (req: GitHubRequest, res: Response): Promise<Response> => {
  try {
    const eventType: string = req.headers['x-github-event'] || 'evento';
    const payload: GitHubWebhookPayload = req.body;

    let message: string = `🚀 Novo evento **${eventType}** recebido!`;
    
    if (eventType === 'push') {
      const repo: string = payload.repository?.full_name || 'repositório';
      const author: string = payload.pusher?.name || 'desenvolvedor';
      const count: number = payload.commits?.length || 0;
      message = `📦 **${count}** novo(s) commit(s) em **${repo}** por **${author}**!`;
    }

    const discordWebhookUrl: string | undefined = "https://discord.com/api/webhooks/1537258197532934144/D1b4tovQEHMULQwEYRGxXS8QFjQZrBls8J-3kF_ueeHsB8_hihhL08AtvSrJVIe3-4jl";

    if (!discordWebhookUrl) {
      console.error('DISCORD_WEBHOOK_URL não configurada.');
      return res.status(500).json({ error: 'Configuração do Discord ausente' });
    }

    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });

    return res.status(200).json({ status: 'Sucesso' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

const PORT: string | number = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor TypeScript rodando na porta ${PORT}`);
});
