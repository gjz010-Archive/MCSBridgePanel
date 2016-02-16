#!/usr/bin/env node
var SPIGOT_PATH="spigot-1.8.8.jar"
var JAVA_PATH="/spigot/jre1.8.0_73/bin/java"
var SPIGOT_DIR="/spigot/";
var TARGET_HOST = "127.0.0.1";
var TARGET_PORT = 25565;


///////////////////////////////////////////////////////////////////////////////
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var net = require('net');
var Tail = require('tail').Tail;
var fs = require('fs');
var spawn = require('child_process').spawn;
console.log(TARGET_HOST);
app.get('/',
function(req, res) {
    //res.send('<h1>Spigot Websocket Bridge 兼容层正在平和地运行。</h1>');
    res.sendfile('console.html');
});

http.listen((process.env.PORT || 8080),
function() {
    console.log('listening on IP:PORT');
});
//////////////////////
//copier=spawn("cp",["-r","./spigot/*","/spigot/"]);
//////////////////////
//////////////////////////////
var spigot_log=new Tail(SPIGOT_DIR+"logs/latest.log");
spigot_log.on("line", function(data) {
  io.emit("writelog",data);
  console.log(data);
});

spigot_log.on("error", function(error) {
  io.emit("writelog",error);
  console.log('ERROR: ', error);
});
var spigot={dead:true};
function bootserver(){
spigot=spawn(JAVA_PATH,['-jar',SPIGOT_PATH],{cwd:SPIGOT_DIR});
spigot.dead=false;
spigot.on('exit', function(code) {
  console.log("Child exited with code "+code);
  spigot.dead=true;
  io.emit("writelog","Child exited with code "+code);
});
}
//////////////////////////////


io.on('connection',
function(socket) {
    console.log('a user connected');
//////////////////////////////////
    socket.on('pings',
    function() {
//console.log("Heartbeat:Pong!");
        socket.emit('pongs');
    });
    socket.currentTunnels={};
    socket.on('disconnect',
    function() {
        console.log("websocket disconnected!");
    });
socket.on('stoptunnel',function(id){
if(socket.currentTunnels[id]!==undefined) socket.currentTunnels[id].end();
});
    socket.on('tunnel',
    function(id) {
        var target = new net.Socket();
        target.connect({
            host: TARGET_HOST,
            port: TARGET_PORT
         },function() {
        console.log('New tunnel built!');
        socket.currentTunnels[id]=target;
         socket.emit('tunnelready',id);
          });
    target.on('data',
    function(data) {
        socket.emit("pipeddata",{"id":id,"data":data});
    });
    target.on('end',
    function() {
        console.log('tunnel disconnected');
        socket.emit('stoptunnel',id);
        delete socket.currentTunnels[id];
    });
    target.on("error",
    function(e) {
        console.log("Could not connect to service " + e);
    });
    });


    //socket.emit("data","Minecraft!")
    socket.on('pipeddata',
    function(obj) {
        //console.log(obj);
        if(socket.currentTunnels[obj["id"]]!==undefined) socket.currentTunnels[obj["id"]].write(obj["data"]);
    });
socket.on("command",function(cmd){
console.log("web:"+cmd);
io.emit("writelog",cmd);
if(!spigot.dead){
spigot.stdin.write(cmd+"\r\n");
}
else if(cmd=="#bootserver"){
io.emit("writelog","Booting server...");
bootserver();
}
else{
io.emit("writelog","Invalid Command!");
}
//spigot.stdin.end();
});
/////////////////////////////////////////////////////
});

