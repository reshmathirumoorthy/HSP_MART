# HSP admin console (Vite build served as static files). Build context: admin/
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_STOREFRONT_URL=""
ENV VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
