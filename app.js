import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import pino from "pino";

const logger = pino();
const port = process.env.PORT || 8009;
const app = express();
app.use(express.json());

const COMPOSE_DIR = "/compose";
const COMPOSE_FILE = "docker-compose.yml";
const DEBOUNCE_DELAY = 5000;

let debounceTimeout;

// Utility to run shell commands with logging
const runCommand = (cmd, label) => {
  exec(cmd, { cwd: COMPOSE_DIR }, (error, stdout, stderr) => {
    if (error) {
      logger.error({ error: error.message }, `${label} failed`);
      return;
    }

    logger.info({ stdout }, `${label} output`);

    if (stderr && stderr.trim()) {
      logger.info({ stderr }, `${label} progress`);
    }

    logger.info(`✅ ${label} completed successfully`);
  });
};

// Deployment logic
const runDeployment = () => {
  logger.info("🔁 Starting deployment sequence...");

  const pullCmd = `docker compose -f ${COMPOSE_FILE} pull`;
  const downCmd = `docker compose -f ${COMPOSE_FILE} down`;
  const upCmd = `docker compose -f ${COMPOSE_FILE} up -d`;

  // It ensures the latest images are pulled, old containers are removed,
  // and new ones are started.
  const fullCommand = `${pullCmd} && ${downCmd} && ${upCmd}`;

  runCommand(fullCommand, "Deployment");
};

// Webhook endpoint
app.post("/webhooks", (req, res) => {
  const repo = req.body?.repository?.repo_name;

  if (!repo) {
    logger.warn("⚠️ Webhook received without repository name.");
    return res.status(400).send("Invalid payload.");
  }

  logger.info(`📦 Webhook received for ${repo}`);
  res.status(200).send("Webhook accepted.");

  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    logger.info(`🚀 Triggering deployment for ${repo}`);
    runDeployment();
  }, DEBOUNCE_DELAY);
});

app.listen(port, () => {
  logger.info(`✅ Webhook listener running on port ${port}`);
});
