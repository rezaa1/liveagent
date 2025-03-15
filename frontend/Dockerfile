   # frontend/Dockerfile
   FROM node:14 as build

   WORKDIR /app

   COPY package*.json ./
   RUN npm install

   COPY . .

   RUN npm run build --verbose
   RUN echo "Contents of /app before checking dist:" && ls -la /app  # Check contents of the app directory
   RUN echo "Contents of /app/dist after build:" && ls -la /app/dist  # Check contents of the dist folder
   RUN echo "Build completed"  # Indicate build completion

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html

   EXPOSE 80

   CMD ["nginx", "-g", "daemon off;"]