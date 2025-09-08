# Docker Webhook Listener

This repository contains a lightweight, standalone service designed to automate continuous deployment to a Raspberry Pi or other server. The service acts as a webhook listener, automatically pulling and restarting Docker containers whenever a new image is pushed to Docker Hub.

## Purpose

The primary goal of this service is to fully automate the CI/CD pipeline. Instead of manually running `docker compose pull` and `docker compose up -d` after a code change, this service listens for a notification from Docker Hub and performs the update automatically. This ensures your production environment is always running the latest code without any manual intervention.

This approach embodies a lean, event-driven deployment model. It decouples the build process from the deployment process, meaning your server only takes action when a new artifact is ready, avoiding unnecessary polling. By making the deployment a "pull" rather than a "push" from your CI environment, it also becomes more resilient to network issues.

## How It Works

1. A new commit is pushed to your `metaforiq-next` or `metaforiq-node` repository.

2. The GitHub Actions workflow builds a new Docker image and pushes it to Docker Hub.

3. Docker Hub, upon receiving the new image, sends a webhook (a simple HTTP POST request) to this listener service.

4. The listener receives the request and executes the `docker compose pull && docker compose up -d` command on the server.

5. Docker Compose updates the running containers with the new image.

## Technical Details

The webhook listener is a simple Node.js application built with a few key dependencies:

- **Express:** A fast, minimalist web framework used to create the single `/webhook` endpoint.
- **Pino:** A highly performant logger that provides structured, easily readable logs. This is critical for debugging the service when it is running in a headless environment.
- **Child Process:** A native Node.js module used to execute the `docker compose` command, bridging the application logic with the Docker CLI.

## Getting Started

Follow these steps to deploy the webhook listener to your server.

### 1. Prerequisites

- A server with Docker and Docker Compose installed.

- A public IP address or a domain name configured to point to your server.

- The `docker-compose.yml` file on your server must be configured to include this service and the Docker Hub credentials.

### 2. Deployment

Since this service is a Docker container, you can deploy it by simply adding its service definition to your main `docker-compose.yml` file.

Add the following service to your `docker-compose.yml`:

```yml
webhooks:
image: your-dockerhub-username/rpi-docker-webhooks:latest
container\_name: rpi-docker-webhooks
restart: unless-stopped
ports:
\- "8009:8009"
networks:
\- rpi-network
```

### 3. Configuring the Docker Hub Webhook

1. Log in to Docker Hub and navigate to your **metaforiq-next** repository.

2. Go to the **Webhooks** tab and create a new webhook.

3. For the **Webhook URL**, enter your server's public IP address or domain name followed by the port and endpoint, for example: `http://your-server-ip:8009/webhook`.
