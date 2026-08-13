import express, { Request, Response } from "express";

const app = express();

app.use(express.json());

// --- INTERFACES DO GITHUB ---
interface GitHubRepository {
  full_name: string;
  html_url: string;
}

interface GitHubPusher {
  name: string;
}

interface GitHubCommit {
  id: string;
  message: string;
  url: string;
}

interface GitHubSender {
  login: string;
  avatar_url: string;
}

interface GitHubWebhookPayload {
  ref?: string;
  repository?: GitHubRepository;
  pusher?: GitHubPusher;
  commits?: GitHubCommit[];
  sender?: GitHubSender;
}

interface GitHubRequest extends Request {
  body: GitHubWebhookPayload;
  headers: {
    "x-github-event"?: string;
    [key: string]: string | string[] | undefined;
  };
}

// --- INTERFACES DO DISCORD ---
interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbedAuthor {
  name: string;
  icon_url?: string;
}

interface DiscordEmbedFooter {
  text: string;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  author?: DiscordEmbedAuthor;
  footer?: DiscordEmbedFooter;
  timestamp?: string;
}

interface DiscordButtonComponent {
  type: number; // 2 para Botão
  style: number; // 5 para Link Button
  label: string;
  url: string;
}

interface DiscordActionRowComponent {
  type: number; // 1 para Action Row
  components: DiscordButtonComponent[];
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
  components: DiscordActionRowComponent[];
}

// --- ROTA DO WEBHOOK ---
app.post(
  "/api/webhook",
  async (req: GitHubRequest, res: Response): Promise<Response> => {
    try {
      const eventType: string = req.headers["x-github-event"] || "evento";
      const payload: GitHubWebhookPayload = req.body;

      // Valores padrão extraídos do payload
      const repoName: string = payload.repository?.full_name ||
        "Repositório Desconhecido";
      const repoUrl: string = payload.repository?.html_url ||
        "https://github.com";
      const branch: string = payload.ref
        ? payload.ref.replace("refs/heads/", "")
        : "main";
      const senderName: string = payload.sender?.login || "Usuário";
      const senderAvatar: string = payload.sender?.avatar_url || "";
      const commitCount: number = payload.commits?.length || 0;

      let latestCommitMessage: string = "Nenhum commit detalhado";
      let latestCommitUrl: string = repoUrl;
      let commitHash: string = "N/A";

      if (commitCount > 0 && payload.commits) {
        const latest = payload.commits[commitCount - 1];
        latestCommitMessage = latest.message;
        latestCommitUrl = latest.url;
        commitHash = latest.id.substring(0, 7);
      }

      // Embed 1: Status Geral do Repositório
      const embedStatus: DiscordEmbed = {
        title: `📦 Atualização no Repositório`,
        url: repoUrl,
        color: 3066993, // Verde
        fields: [
          {
            name: "📂 Repositório",
            value: `[${repoName}](${repoUrl})`,
            inline: true,
          },
          { name: "🌿 Branch", value: `\`${branch}\``, inline: true },
          {
            name: "📊 Status da Operação",
            value: `✅ **Sucesso** (${commitCount} novo(s) commit(s))`,
            inline: false,
          },
        ],
        author: {
          name: senderName,
          icon_url: senderAvatar,
        },
        timestamp: new Date().toISOString(),
      };

      // Embed 2: Detalhes do Último Commit
      const embedDetails: DiscordEmbed = {
        title: `🔍 Detalhes do Último Commit`,
        url: latestCommitUrl,
        color: 3447003, // Azul
        description: `\`${commitHash}\`: ${latestCommitMessage}`,
        footer: {
          text: "GitHub Webhook Integration • TypeScript",
        },
      };

      // Componente de Linha com o Link Button
      const buttonComponent: DiscordActionRowComponent = {
        type: 1, // Action Row
        components: [
          {
            type: 2, // Button
            style: 5, // Link Button
            label: "Ver no GitHub",
            url: commitCount > 0 ? latestCommitUrl : repoUrl,
          },
        ],
      };

      const discordPayload: DiscordWebhookPayload = {
        embeds: [embedStatus, embedDetails],
        components: [buttonComponent],
      };

      const discordWebhookUrl: string | undefined =
        "https://discord.com/api/webhooks/1537258197532934144/D1b4tovQEHMULQwEYRGxXS8QFjQZrBls8J-3kF_ueeHsB8_hihhL08AtvSrJVIe3-4jl";

      if (!discordWebhookUrl) {
        console.error("DISCORD_WEBHOOK_URL não configurada.");
        return res.status(500).json({
          error: "Configuração do Discord ausente",
        });
      }

      // Envia tudo empacotado para o Discord
      await fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discordPayload),
      });

      return res.status(200).json({ status: "Sucesso" });
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
      return res.status(500).json({ error: "Erro ao processar webhook" });
    }
  },
);

const PORT: string | number = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor TypeScript rodando na porta ${PORT}`);
});
