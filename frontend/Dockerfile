FROM node:18-alpine as build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source files and configuration
COPY . .

# Build the application
RUN npm run build

# Use nginx for serving
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]