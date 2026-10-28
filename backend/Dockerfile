FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
# Cria as tabelas, cria as contas de teste (idempotente) e inicia a API
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
