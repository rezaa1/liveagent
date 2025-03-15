FROM node:14 as build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy all necessary files for the build
COPY vite.config.ts .
COPY tsconfig*.json ./
COPY index.html .
COPY public/ ./public/
COPY src/ ./src/

# Build the application and verify the output
RUN npm run build && ls -la dist/

# Use nginx for serving
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]