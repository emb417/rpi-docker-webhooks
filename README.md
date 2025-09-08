# 🛠️ Managing the Listener Container

As of the latest update, the webhook listener is no longer managed via `docker-compose.yml`. This avoids conflicts during deployment and ensures the listener remains active while orchestrating other containers.

## 🔄 Running the Listener

To start the listener manually:

```bash
docker run -d \
  --name webhook-listener \
  --restart always \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /home/eric/rpi-docker-compose:/compose \
  emb417/rpi-docker-webhooks:latest
```

## 🛑 Stopping the Listener

To stop the listener:

```bash
docker stop webhook-listener
```

## 🗑️ Removing the Listener

To remove the container entirely:

```bash
docker rm -f webhook-listener
```

## 🔄 Restarting the Listener

To restart the listener after changes:

```bash
docker restart webhook-listener
```

## 🔍 Checking Logs

To view real-time logs:

```bash
docker logs -f webhook-listener
```
