#!/usr/bin/env node
var net=require('net');
var HOST='127.0.0.1';
var PORT=18089;
var WEBSOCKET_ADDR="http://spigotwsbridge.dotcloudapp.com/"; //美国代理1
//var WEBSOCKET_ADDR='http://rocky-garden-3559.herokuapp.com/'; //美国代理2
//var WEBSOCKET_ADDR="http://infinite-citadel-5348.herokuapp.com/"; //欧洲代理
//var WEBSOCKET_ADDR="http://spigotwsbridge-gjz010no1.rhcloud.com/" //服务器地址
//var WEBSOCKET_ADDR='http://127.0.0.1:8080/'; //不可用
var counter=0;
var pingproc;
var local_socks=[];
var ws=require('socket.io-client')(WEBSOCKET_ADDR);
ws.on('connect', function(){
console.log("Websocket connected!");
pingproc=setInterval(function(){
//console.log(counter);
ws.emit("pings");
counter++;
},5000);
});
ws.on('pipeddata', function(obj){
if(local_socks[obj["id"]]!==undefined) local_socks[obj["id"]].write(obj["data"]);
});

ws.on('pongs',function(){
//console.log("Heartbeat:Pong!");
counter--;
});
ws.on('tunnelready',function(id){
if(local_socks[id]!==undefined) local_socks[id].resume();
});
ws.on('disconnect', function(){
console.log("Websocket disconnected!")
});
ws.on('stoptunnel',function(id){
if(local_socks[id]!==undefined) local_socks[id].end();
});
var localserver=net.createServer(function(sock){
var id=local_socks.push(sock)-1;
console.log('CONNECTED: ' +
        sock.remoteAddress + ':' + sock.remotePort);
ws.emit("tunnel",id);
sock.pause();
    sock.on('data', function(data) {
        //console.log('DATA ' + sock.remoteAddress + ': ' + data);
        // 回发该数据，客户端将收到来自服务端的数据
        //sock.write('You said "' + data + '"');
	ws.emit("pipeddata",{"id":id,"data":data});
    });

    // 为这个socket实例添加一个"close"事件处理函数
    sock.on('close', function(data) {
	ws.emit('stoptunnel',id);
	delete local_socks[id];
        //console.log('CLOSED: ' +
        //    sock.remoteAddress + ' ' + sock.remotePort);
	//ws.disconnect();
    });
    sock.on('error',function(err){
        console.log("Could not connect to service " + e);
	});
}).listen(PORT,HOST);
