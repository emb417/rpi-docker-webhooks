import express from "express";
import { exec } from "child_process";
import pino from "pino";

// Configure logging for clear, actionable output.
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

const app = express();
const port = 8009;

// Middleware to parse JSON bodies
app.use(express.json());

// Define the webhook endpoint.
// Docker Hub sends a POST request to this endpoint when an image is pushed.
app.post("/webhook", (req, res) => {
  logger.info("Webhook received. Processing deployment...");

  // This command will stop, pull the latest images, and restart all services.
  const deployCommand = "docker compose pull && docker compose up -d";

  // Execute the command to update the running containers.
  exec(deployCommand, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Exec error: ${error.message}`);
      return res.status(500).send(`Deployment failed: ${error.message}`);
    }

    if (stderr) {
      logger.error(`Stderr: ${stderr}`);
      return res.status(500).send(`Deployment failed: ${stderr}`);
    }

    logger.info(`Stdout: ${stdout}`);
    logger.info("Deployment successful!");
    res.status(200).send("Deployment successful!");
  });
});

// Simple health check endpoint.
app.get("/", (req, res) => {
  res.status(200).send("Webhook listener is running.");
});

// Start the server.
app.listen(port, () => {
  logger.info(`Webhook listener running at http://localhost:${port}`);
});
