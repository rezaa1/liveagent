FROM node:14 as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Verify build output
RUN ls -la /app/dist || echo "Build failed - dist directory not created"

# Use nginx for serving
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]