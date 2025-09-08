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

// Debounce logic to handle multiple rapid webhooks from a single push
let debounceTimeout;
const DEBOUNCE_DELAY = 5000; // 5 seconds

const runDeployment = () => {
  // Define the docker compose file path once to avoid repetition
  const dockerComposeFile = "/compose/docker-compose.yml";

  // This is the most robust and production-ready solution. It gracefully handles
  // cases where containers are already stopped or removed, ensuring the
  // deployment script continues without error.
  const command = `echo "Starting integrated deployment..." && docker stop webhook-listener metaforiq-next metaforiq-node nginx || true && docker rm -f webhook-listener metaforiq-next metaforiq-node nginx || true && docker compose -f ${dockerComposeFile} pull && docker compose -f ${dockerComposeFile} up -d`;

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
};

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

    // Immediately send a 200 OK response to prevent timeouts.
    // The deployment commands will run in the background.
    res.status(200).send("Webhook received and deployment started.");

    // Clear any existing timeout and set a new one
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      logger.info(`Triggering debounced deployment for ${webhook}.`);
      runDeployment();
    }, DEBOUNCE_DELAY);
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
