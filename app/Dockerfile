# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install

# build the static bundle
COPY . .
RUN npm run build

# ---- serve stage ----
FROM nginx:alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
