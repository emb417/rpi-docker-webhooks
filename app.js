import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import pino from "pino";

// Set up logging to a standard format without pino-pretty
const logger = pino();

const port = 8009;
const app = express();

// Middleware to parse the JSON body
app.use(express.json());

// Webhook route
app.post("/webhooks", (req, res) => {
  try {
    const webhook = req.body.repository?.repo_name;
    const mediaType = req.body.mediaType;
    const isFinalPush =
      mediaType === "application/vnd.docker.distribution.manifest.list.v2+json";

    if (!webhook) {
      logger.warn("Received a request with no repository name.");
      res.status(400).send("Invalid webhook payload.");
      return;
    }

    logger.info(`Webhook received for ${webhook}`);
    logger.info(`Processing webhook with mediaType: ${mediaType}`);

    // Immediately send a 200 OK response to prevent timeouts.
    // The deployment commands will run in the background.
    res.status(200).send("Webhook received and deployment started.");

    // Only run the deployment command for the final, multi-architecture manifest list push.
    if (isFinalPush) {
      // Define the docker compose file path once to avoid repetition
      const dockerComposeFile = "/compose/docker-compose.yml";
      const command = `echo "Starting integrated deployment..." && docker compose -f ${dockerComposeFile} down && docker compose -f ${dockerComposeFile} pull && docker compose -f ${dockerComposeFile} up -d`;

      // The `cwd` option is necessary to run the command from the directory
      // containing the `docker-compose.yml` file.
      exec(command, { cwd: "/compose" }, (error, stdout, stderr) => {
        if (error) {
          logger.error({ error: error.message }, "exec error");
          return; // A response has already been sent
        }
        logger.info(`stdout: ${stdout}`);
        if (stderr) {
          logger.warn(`stderr: ${stderr}`);
        }
      });
    } else {
      logger.info(
        `Ignoring webhook for ${webhook} as it is not the final manifest push.`
      );
    }
  } catch (e) {
    logger.error(
      { error: e.message },
      "Failed to parse JSON payload or process webhook"
    );
    // A response might have been sent already, so log the error instead of returning one.
  }
});

app.listen(port, () => {
  logger.info(`Webhook listener running on port ${port}`);
});
