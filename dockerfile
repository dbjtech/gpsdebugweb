FROM node:alpine

RUN apk add --update --no-cache curl git
RUN curl "https://install.meteor.com/?release=0.7.0.1" | sh
RUN npm i meteorite -g && npm cache clean --force

RUN mkdir /src
WORKDIR /src
RUN git clone https://github.com/dbjtech/gpsdebugweb

CMD ash
