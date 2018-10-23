var socket = io();

var players = {};

function makeClientsidePlayer() {
    return {
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

socket.on('player.join', (msg) => {
    console.log("Player joined w/ uuid", msg.uuid);
    let newPlayer = makeClientsidePlayer();
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
    let player = players[msg.uuid];

    // Received a new position update of their current position, so set the last position to the current position
    msg.position.interp.x = player.position.x;
    msg.position.interp.y = player.position.y;
    msg.position.interp.rate = 0.1;

    players[msg.uuid] = msg;
});