var socket = io();

var players = {};

function makePlayer() {
    return {
        x: 100,
        y: 600,
        width: 35,
        height: 35,
        vx : 0,
        vy : 0,
        color: "#FF0000",
        inAir: true
    };
}

socket.on('player.join', (msg) => {
    console.log("Player joined w/ uuid", msg.uuid);
    let newPlayer = makePlayer();
    newPlayer.uuid = msg.uuid;
    players[newPlayer.uuid] = newPlayer;
});

socket.on('player.disconnect', (msg) => {
    console.log("Player disconnected w/ uuid", msg.uuid);
    delete players[msg.uuid];
});

socket.on('players', (msg) => {
    players = msg;
    console.log("Received all players", players);
    delete players[player.uuid]; // remove ourself from the dict
});

socket.on('player.uuid', (msg) => {
    console.log('uuid', msg);
    player.uuid = msg;
});

socket.on('player.move', (msg) => {
    if (!players[msg.uuid]) {
        players[msg.uuid] = makePlayer();
    }
    players[msg.uuid] = msg;
});