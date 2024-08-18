FROM node:alpine

RUN npm install -g nodemon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install mkcert -g
RUN mkcert create-ca
RUN mkcert create-cert

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8083
CMD [ "nodemon", "server.js" ]
