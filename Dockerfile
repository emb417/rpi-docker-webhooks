#
# === Stage 1: The Build Stage ===
# Use a lean Node.js image to build the application.
#
FROM node:24-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the application code
COPY . .

#
# === Stage 2: The Runner Stage ===
# This is the final, production image. It is very small and contains
# only the necessary files to run the listener.
#
FROM node:24-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy the node modules and application code from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app.js ./app.js

# Expose the port
EXPOSE 8009

# Start the application
CMD ["node", "app.js"]
