FROM node:alpine

RUN npm install -g nodemon
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8083
CMD [ "nodemon", "server.js" ]
