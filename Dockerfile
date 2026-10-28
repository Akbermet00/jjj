FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/* \
 && npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
