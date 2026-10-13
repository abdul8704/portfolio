FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 DATA_DIR=/data
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# scripts (sqlite-to-postgres, load-resume, media-to-s3) import from src/lib
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 4321
USER node
CMD ["node", "dist/server/entry.mjs"]
