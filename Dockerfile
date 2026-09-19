#STREAMING_CHUNK: Setting up Node build stage...
#Stage 1: Build the React Application using Vite
FROM node:18-alpine AS builder
WORKDIR /app

#Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

#Copy application source code and build it
COPY . .
RUN npm run build

#STREAMING_CHUNK: Configuring lightweight production server...
#Stage 2: Serve the application using a lightweight static server
FROM node:18-alpine
WORKDIR /app

#Install the "serve" package globally
RUN npm install -g serve

#Copy only the compiled dist folder from the builder stage
COPY --from=builder /app/dist ./dist

#Cloud Run expects the container to listen on the $PORT environment variable
#(Defaults to 8080 if not explicitly set)
EXPOSE 80

#Start the server targeting the dist folder and binding to the dynamic port
CMD ["sh", "-c", "serve -s dist -l ${PORT:-80}"]
