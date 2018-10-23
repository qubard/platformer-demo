const express = require('express')
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http)

const uuidv1 = require('uuid/v1');

app.use(express.static('public'))

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var players = {};

function makeServersidePlayer(uuid) {
    return {
        uuid: uuid,
        position: {
            x: 100,
            y: 600,
            interp: {
                x: 100,
                y: 600
            },
            vx : 0,
            vy : 0
        },
        width: 35,
        height: 35,
        color: "#FF0000",
        inAir: true
    };
}


io.on('connection', (socket) => {
    let uuid = uuidv1();
    console.log(uuid, "connected.");

    // Let the player know their uuid
    socket.emit('player.uuid', uuid);
    
    // Add the player to our dictionary
    players[uuid] = makeServersidePlayer(uuid);

    // Let the player know about every player (including itself, we distinguish using uuid)
    socket.emit('players', players);

    // Let the other players know about this player joining
    socket.broadcast.emit('player.join', players[uuid]);

    // Let the other players know about this player disconnecting, delete from our table
    socket.on('disconnect', () => {
        console.log(uuid, "user disconnected.");
        delete players[uuid];
        socket.broadcast.emit('player.disconnect', { uuid: uuid })
    });
    
    // Let the other players know about this player moving, update our table
    socket.on('player.move', (msg) => {
        msg.uuid = uuid;
        players[uuid] = msg;
        socket.broadcast.emit('player.move', msg);
    });
});

// Serve index.html
http.listen(3000, () => {
    console.log('listening on *:3000');
});