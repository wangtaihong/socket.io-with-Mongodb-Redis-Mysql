//by taihong
var server = require('http').createServer(),
    config = require('dotenv').config(),//引入配置文件
    io = require('socket.io')(server);
io
    .of('/buildorder')
    .on('connection', socket => {
        console.log('user connected to buildorder');
        socket.on('disconnect', () => console.log('user disconnected'));
    });

io
    .of('/notification')
    .on('connection', socket => console.log('user connected to message'));

io
    .of('/reallocation')
    .on('connection',socket => {
        console.log('New connection:',socket.id);
        socket.emit('message', "hello!");
        socket.on('disconnect',function(){
            console.log('Disconnected reallocation');
        });
        socket.on('message',function(data){
            console.log('Message from client:',data,new Date().Format("yyyy-MM-dd hh:mm:ss"));
            if (data.mast_id!='' && data.lat!=0 && data.lng!=0) {
                mongoWrite(data);
                mysqlWrite(data);
                socket.emit('message', '{"status":200,"msg":"success"}');
            }
        });
    });

server.listen(3001, () => console.log('Socket.IO listen to port 3001'));

//Redis
var redis = require('redis');
var redisClient = redis.createClient(
        process.env.REDIS_PORT,
        process.env.REDIS_HOST
    );
redisClient.auth(process.env.REDIS_AUTH, function() {console.log("Redis Connected!");});
var BUILDORDER_CHANNEL = 'buildorder_channel', NOTIFICATION_CHANNEL = 'notification_channel';
redisClient.on("error", function (err) {
    console.log("Error " + err);
});
//test
redisClient.keys('name',function(err,key){
    if (err) {console.log(err);}
    console.log(key);
});
redisClient.on('message', function(channel, message) {
    console.log(channel);
    console.log(message);
    switch (channel){
        case BUILDORDER_CHANNEL:
            console.log('buildorder received:', message);
            io.of('/buildorder').emit('message', message);
            break;
        case NOTIFICATION_CHANNEL:
            console.log('notification received:', message);
            io.of('/notification').emit('message', message);
            break;
    }
});
redisClient.subscribe(BUILDORDER_CHANNEL);
redisClient.subscribe(NOTIFICATION_CHANNEL);

//MongoDB
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var mongodb_name = process.env.MONGO_NAME;
var url = process.env.MONGO_URL;
//url format:'mongodb://'+DATABASEUSERNAME+':'+DATABASEPASSWORD+'@'+DATABASEHOST+':'DATABASEPORT+'/'+DATABASENAME
var mongoWrite = function(data){
    MongoClient.connect(url, function(err, db) {
        if (err) {console.log(err);return false;}
        assert.equal(null, err);
        console.log("Connected correctly to server.");
        insertDocument(db, data, function() {
            db.close();
            return true;
        });
        db.close();
    });
}
var insertDocument = function(db, data, callback) {
    db.collection(mongodb_name).insertOne( {
        "mast_id" : data.mast_id,
        "lat" : data.lat,
        "lng" : data.lng,
        "time" : Date.parse(new Date())/1000
    }, function(err, result) {
        assert.equal(err, null);
        console.log("Inserted a document into the " + mongodb_name + " collection .");
        callback();
    });
};

//Mysql
var mysql = require('mysql'),
    connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PWD,
        database: process.env.MYSQL_DB,
        port: process.env.MYSQL_PORT
    });
connection.connect(function(err) {
  if (err) {console.log(err);}
  else{console.log("Mysql Connected!");}
});

var mysqlWrite = function(data){
    var sql = "";
    sql += "UPDATE `dm_master` SET `mast_lat` = '"+data.lat;
    sql +="', `mast_lng` = '"+data.lng+"' WHERE `dm_master`.`mast_id` = "+data.mast_id+"";
    var query = connection.query(sql),List = []; // List保存查询结果
    query
        .on('error', function(err) {
            console.log(err);
        })
        .on('result', function(re) {
            console.log("mysql query success:affectedRows",re.affectedRows);
            // List.push(re);
        })
        .on('end', function() {
            // console.log('end');
        });
}

//date format
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, 
        "d+": this.getDate(), 
        "h+": this.getHours(),
        "m+": this.getMinutes(),
        "s+": this.getSeconds(),
        "q+": Math.floor((this.getMonth() + 3) / 3),
        "S": this.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}