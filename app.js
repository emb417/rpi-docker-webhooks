import "dotenv/config";
import express from "express";
import { exec } from "child_process";
import pino from "pino";

const logger = pino();

const port = 8009;
const app = express();

app.use(express.json());

app.post("/webhooks", (req, res) => {
  try {
    const webhook = req.body.repository?.repo_name;
    if (!webhook) {
      logger.warn("Received a request with no repository name.");
      res.status(400).send("Invalid webhook payload.");
      return;
    }

    logger.info(`Webhook received for ${webhook}`);

    // Immediately send a 200 OK response to prevent timeouts.
    // The deployment commands will run in the background.
    res.status(200).send("Webhook received and deployment started.");

    // Define the docker compose file path once to avoid repetition
    const dockerComposeFile = "/compose/docker-compose.yml";
    let command = "";
    command = `echo "Starting integrated deployment..." && docker compose -f ${dockerComposeFile} ps -q | xargs docker stop && docker compose -f ${dockerComposeFile} ps -q -a | xargs docker rm -f && docker compose -f ${dockerComposeFile} pull && docker compose -f ${dockerComposeFile} up -d`;

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
  } catch (e) {
    logger.error(
      { error: e.message },
      "Failed to parse JSON payload or process webhook"
    );
  }
});

app.listen(port, () => {
  logger.info(`Webhook listener running on port ${port}`);
});
