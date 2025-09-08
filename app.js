import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import pino from "pino";

// Set up logging
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

const port = 8009;
const app = express();

// Middleware to parse the JSON body
app.use(express.json());

// Webhook route
app.post("/webhooks", (req, res) => {
  try {
    const webhook = req.body.repository?.repo_name;
    if (!webhook) {
      logger.warn("Received a request with no repository name.");
      res.status(400).send("Invalid webhook payload.");
      return;
    }

    logger.info(`Webhook received for ${webhook}`);

    // Define the docker compose file path once to avoid repetition
    const dockerComposeFile = "/compose/docker-compose.yml";
    let command = "";
    let serviceName = "";
    let containerName = "";

    // Check which repository sent the webhook and set the appropriate command.
    if (webhook.includes("metaforiq-next")) {
      logger.info("received Next.js webhook");
      serviceName = "metaforiq-next";
      containerName = "metaforiq-next";
    } else if (webhook.includes("metaforiq-node")) {
      logger.info("received Node.js webhook");
      serviceName = "metaforiq-node";
      containerName = "metaforiq-node";
    } else if (webhook.includes("rpi-nginx")) {
      logger.info("received Nginx webhook");
      serviceName = "nginx";
      containerName = "rpi-nginx";
    } else {
      logger.info("received unknown webhook");
      res.status(400).send("Unknown webhook payload.");
      return;
    }

    // This command uses lower-level `docker` commands to explicitly stop and remove
    // the container by its name, then uses `docker compose` to pull and recreate it.
    command = `echo "Starting deployment for ${serviceName}..." && docker stop ${containerName} && docker rm -f ${containerName} && docker compose -f ${dockerComposeFile} pull ${serviceName} && docker compose -f ${dockerComposeFile} up -d ${serviceName} --no-deps`;

    // The `cwd` option is necessary to run the command from the directory
    // containing the `docker-compose.yml` file.
    exec(command, { cwd: "/compose" }, (error, stdout, stderr) => {
      if (error) {
        logger.error({ error: error.message }, "exec error");
        return res.status(500).send(`Server Error: ${error}`);
      }
      logger.info(`stdout: ${stdout}`);
      if (stderr) {
        logger.warn(`stderr: ${stderr}`);
      }
      res.status(200).send("Webhook received and processed.");
    });
  } catch (e) {
    logger.error(
      { error: e.message },
      "Failed to parse JSON payload or process webhook"
    );
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  logger.info(`Webhook listener running on port ${port}`);
});
