FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npm", "start"]
