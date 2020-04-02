var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var portNumber = 5000;
var code=0;
var mCodes = new Map();

server.listen(process.env.PORT || portNumber);
console.log("server is up and running, listening on port: " + portNumber);

function getCode(){
    do{
        var c = Math.floor(Math.random() * Math.floor(10000));
        var done = mCodes.has(c);
    }
    while (done)
    mCodes.set(c,1);
    return c;
}

io.on('connection', function(socket){
    console.log("on Connection");

socket.on('createGame', function(data){
    console.log("on create Game");
    code = getCode();
    socket.join(code);
    var now = new Date().getTime();
    socket.emit('newGame', {name: data.name, room: code, time: now});


    // clean up any unused rooms
    /*
    const aKeys = Array.from( mCodes.keys());
    for(i=0;i<aKeys.length; i++){
        var tempRoom = aKeys[i];;
        //var clients = io.sockets.adapter.rooms[tempRoom].sockets;
        io.in(tempRoom).clients((err , clients) => {
            // clients will be array of socket ids , currently available in given room
            io.of(tempRoom).clients((error, clients) => {
              if (error){
                clients.forEach(socketId => io.sockets.sockets[socketId].leave(tempRoom));
                return;
              }
              console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
            });            
        });
    }
    */

});
socket.on('joinGame', function(data){
    console.log("on Join Game");
    var now = new Date().getTime();
    code = parseInt(data.room);
    var exist = mCodes.has(code);
    if ( !exist ){
        socket.emit('err', {text: 'That code does not exist, please enter a valid code.', time: now});
    }
    else{

        var room = io.nsps['/'].adapter.rooms[code];
        if ( ( room && room.length == 1 ) || (2 > mCodes.get(code) ) ){
            var count = mCodes.get(code) + 1;
            mCodes.set(code,count);
            socket.join(code);
            console.log(io.nsps['/'].adapter.rooms[code]);
            //socket.broadcast.to(code).emit('player1', {});
            var msg = data.name + " has joined the game";
            var now = new Date().getTime();
            console.log("broadcasting joined message");
            socket.broadcast.to(code).emit('joined', {text: msg, time: now});
            socket.emit('player2', {code: code, time: now});
            //socket.in(code).emit('joined', {text: msg, time: now});
        }
        else {
            socket.emit('err', {text: 'Sorry, The room is full!', time: now});
        }
    }
});

socket.on('message', function(data){
    console.log("on Message" );
    var now = new Date().getTime();
    //socket.broadcast.to(data.room).emit('message', { name:data.name, text: data.text, color: data.color, time: now});
    socket.emit('message', {  name:data.name, text: data.text, color: data.color, time: now});
    socket.in(data.room).emit('message', {  name:data.name, text: data.text, color: data.color, time: now});
});

socket.on('turn', function(data){
    //console.log("on Turn: " + data.room);
    //socket.broadcast.to(data.room).emit('message', { name:data.name, text: data.text, color: data.color, time: now});
    //socket.emit('message', {  name:data.name, text: data.text, color: data.color, time: now});
    socket.broadcast.to(data.room).emit('turn', {name: data.name, id: data.id, room: data.room});
});
socket.on('playAgain', function(data){
    socket.broadcast.to(data.room).emit('playAgain');
});

})  //  end io.on  connection