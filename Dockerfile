FROM node:alpine

RUN npm install -g pm2

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install mkcert -g
RUN mkcert create-ca
RUN mkcert create-cert

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8083
CMD [ "pm2-runtime", "ecosystem.config.js" ]
