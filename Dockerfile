FROM node:20-alpine

# git requis par npm pour résoudre "@nestjs/swagger": "github:nestjs/swagger"
RUN apk add --no-cache git

WORKDIR /app
COPY utilisateurs/package*.json ./
RUN npm install
COPY utilisateurs/. .
RUN npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "start:prod"]
