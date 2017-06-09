## Usage

### use docker image

```
docker run -it -p 8080:80 -e MONGO_URL=mongodb://mongodb:27017/meteor -e PORT=80 -e ROOT_URL=http://localhost:8080/ dbjtech/gpsdebugweb
```

### use docker compose

```
docker-compose up
```

## Old readme

This repo code with meteor@0.7.0.1 which is no longer maintanied.

Use docker to deploy.

```
prepare
1. install git
2. install nodejs
	sudo apt-get install python-software-properties python g++ make
	sudo add-apt-repository ppa:chris-lea/node.js
	sudo apt-get update
	sudo apt-get install nodejs
3. install npm
	curl https://npmjs.org/install.sh|sudo sh
4. install mongodb
	//can skip
5. install meteor
	curl https://install.meteor.com|sudo sh
6. install meteorite
	sudo npm install meteorite -g
7. run
	git clone XXX
	mrt
8. import google geo convert db
	sudo npm install mongoskin -g
	cd .tools
	node load_google_geo.js
```
