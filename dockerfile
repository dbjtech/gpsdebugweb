FROM node:alpine

RUN apk add --update --no-cache curl git
RUN curl "https://install.meteor.com/" | sh
# RUN npm i meteorite -g && npm cache clean --force

RUN mkdir /src
WORKDIR /src
RUN git clone --depth 1 https://github.com/dbjtech/gpsdebugweb

CMD ash
