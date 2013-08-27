mongod --bind_ip localhost --replSet meteor --dbpath .meteor/local/db&
sleep 3
echo "rs.initiate({_id:'meteor',members:[{_id:0,host:'localhost'}]})"|mongo
export MONGO_URL=mongodb://localhost:27017/meteor
export OPLOG_URL=mongodb://localhost:27017/local
