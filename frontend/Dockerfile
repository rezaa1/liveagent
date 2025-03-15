   # frontend/Dockerfile
   FROM node:14 as build

   WORKDIR /app

   COPY package*.json ./
   RUN npm install

   COPY . .

   RUN npm run build
   RUN ls -la /app/dist  # Check contents of the dist folder
   RUN echo "Build completed"  # Indicate build completion

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html

   EXPOSE 80

   CMD ["nginx", "-g", "daemon off;"]