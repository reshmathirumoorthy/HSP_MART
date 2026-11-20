# HSP Mart storefront + partner/supplier portals (Next.js). Build context: repository root.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
# Pages render at request time, so the build never needs the API.
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app ./
USER node
EXPOSE 3000
CMD ["npm", "start"]
