FROM node:4.8-alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add tzdata --update --no-cache && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo "Asia/Shanghai" /etc/localtime && apk del tzdata
WORKDIR /src/app/programs/server
RUN apk add --no-cache python make g++ && npm i fibers@^1.0.0 && npm cache clean && apk del python make g++

COPY ./dest /src/app
WORKDIR /src/app

CMD node main.js

EXPOSE 80
