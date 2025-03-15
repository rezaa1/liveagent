FROM node:14 as build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the entire project for building
COPY . .

# Build the application and verify the output
RUN npm run build && ls -la dist/

# Use nginx for serving
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Add nginx configuration if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]