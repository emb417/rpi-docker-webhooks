import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import pino from "pino";

// Set up logging
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const app = express();
const port = 8009;

// Middleware
app.use(express.json());

// Routes
app.post("/webhooks", (req, res) => {
  logger.info(`webhook received...`);
  logger.info(`payload from ${req.headers["x-real-ip"]}`);
  logger.info(req.body);

  if (
    !req.body ||
    !req.body.push_data ||
    !req.body.repository ||
    !req.body.repository.repo_name
  ) {
    logger.error("Invalid webhook payload received.");
    return res.status(400).send("Invalid webhook payload.");
  }

  // The 'docker compose' command must be executed from the directory that
  // contains the docker-compose.yml file.
  const webhook = req.body.repository.repo_name;
  let command = "";
  if (webhook.includes("metaforiq-next")) {
    logger.info("received Next.js webhook");
    command =
      "docker compose pull metaforiq-next && docker compose up -d metaforiq-next";
  } else if (webhook.includes("metaforiq-node")) {
    logger.info("received Node.js webhook");
    command =
      "docker compose pull metaforiq-node && docker compose up -d metaforiq-node";
  } else if (webhook.includes("rpi-nginx")) {
    logger.info("received Nginx webhook");
    command = "docker compose pull nginx && docker compose up -d nginx";
  } else {
    logger.info("received unknown webhook");
    res.status(400).send("Unknown webhook payload.");
  }

  // Set the correct working directory and execute the command.
  exec(command, { cwd: "/compose" }, (err, stdout, stderr) => {
    if (err) {
      logger.error(`exec error: ${err}`);
      return res.status(500).send(`Server Error: ${err}`);
    }
    logger.info(`stdout: ${stdout}`);
    if (stderr) {
      logger.error(`stderr: ${stderr}`);
    }
    res.status(200).send("Command executed successfully.");
  });
});

// Start the server
app.listen(port, () => {
  logger.info(`server listening at http://localhost:${port}`);
});
