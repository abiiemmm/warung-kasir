FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# tsx dipakai untuk menjalankan TypeScript langsung, jadi devDependencies tetap dibutuhkan.
COPY package.json package-lock.json ./
RUN npm ci --include=dev && npm cache clean --force

COPY tsconfig.json ./
COPY src/ ./src/

# Direktori data harus dimiliki user non-root agar SQLite bisa menulis.
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["npm", "start"]
