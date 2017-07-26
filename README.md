# socket.io with Mongodb-Redis-Mysql

### config .env file for　Mongodb、Redis、Mysql
``````

### Init and Run
npm install
node server.js (or run command 'forever start server.js' to keep the nodejs process)
``````

### Test
redis-cli
127.0.0.1:6379> publish buildorder_channel "Hello jon."
(integer) 1
```
