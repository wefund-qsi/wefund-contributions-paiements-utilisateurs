FROM node:20-alpine
WORKDIR /app
COPY utilisateurs/package*.json ./
RUN npm install
COPY utilisateurs/. .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
