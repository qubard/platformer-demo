var canvas = document.getElementById("canvas");

var keys = {};

document.addEventListener('keydown', function(event) {
    keys[event.keyCode] = true;
});

document.addEventListener('keyup', function(event) {
    keys[event.keyCode] = false;
});

function makePlatform(x, y, w, h) {
    return { x: x, y: y, width: w, height: h };
}

// All rates are specified in milliseconds
var PARAMS = {
    COLLISION: {
        epsilon: 0.5
    },
    PHYSICS: {
        GRAVITY: 1
    },
    TICK_RATE: 25, // 40 times per second
    WIDTH: 900,
    HEIGHT: 800,
    PACKET_RATE: 50 // 20 times per second
}

var platforms = [
    makePlatform(100, 100, 500, 50),
    makePlatform(100, 650, 800, 50),
    makePlatform(170, 400, 150, 50),
    makePlatform(150, 350, 50, 150),
    makePlatform(350, 350, 50, 150),
    makePlatform(50, 500, 50, 50),
    makePlatform(450, 400, 150, 50),
]

var LAST_PACKET = Date.now();

var player = makeClientsidePlayer();

function emitMoveEvent() {
    socket.emit('player.move', player);
}

emitMoveEvent();

function inAir(ent) {
    for (var i = 0; i < platforms.length; i++) {
        var platform = platforms[i];
        if (collidesParam(ent.position.x, ent.position.y + 1, ent.width, ent.height, platform)) {
            return false;
        }
    }
    return true;
}

var camera = {
    x: 0,
    y: 0,
    width: PARAMS.WIDTH,
    height: PARAMS.HEIGHT
}

// Render a rect relative to the camera
function rectRelative(x, y, width, height, col) {
    rect(Math.round(x - camera.x), Math.round(y - camera.y), width, height, col); // Floor so that there's no weird aliasing
}

function rect(x, y, width, height, col) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function loop() {
    rect(0, 0, camera.width, camera.height, "#FFFFFF");
    
    doInput();
    
    if (canMoveEntity(player)) {
        moveEntity(player);
        updateCamera();
        player.inAir = inAir(player);
    }

    if (Date.now() - LAST_PACKET >= PARAMS.PACKET_RATE) {
        emitMoveEvent();
        LAST_PACKET = Date.now();
    }

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.position.x, player.position.y, player.width, player.height, player.color);

    for (uuid in players) {
        let player = players[uuid];
        player.color = player.inAir ? "#FFFF00" : "#FF0000";
        let pos = player.position;
        rectRelative(
            (pos.x - pos.interp.x) * pos.interp.rate + pos.interp.x, 
            (pos.y - pos.interp.y) * pos.interp.rate + pos.interp.y, 
            player.width, player.height, player.color);


        // Since interpolation parameters are clientside, we set them clientside
        if (!player.position.interp.rate) {
            player.position.interp.rate = 0;
        }

        // We expect to receive a packet back every 2 * PACKET_RATE (or so), so this is our interpolation ratio
        // In reality this is our PING + OTHER PLAYER'S PING
        player.position.interp.rate = Math.min(1, player.position.interp.rate + PARAMS.TICK_RATE / (2 * PARAMS.PACKET_RATE));
    }

    // Can't decrement y-velocity constantly because it causes magnitude of <vx, vy> to blow up
    if (player.inAir) {
        player.position.vy -= PARAMS.PHYSICS.GRAVITY;
    } else {
        player.position.vy = 0;
    }

    player.color = player.inAir ? "#FFFF00" : "#FF0000";
}

function doInput() {
    player.position.vx = 0;
    
    if (keys[38] && !player.inAir) {
        player.position.vy = 30;
    }

    if (keys[37]) {
        player.position.vx -= 5;
    }

    if (keys[39]) {
        player.position.vx += 5;
    }
}

function collides(a, b) {
    if (a.x > b.x + b.width || b.x > a.x + a.width) {
        return false;
    }
    
    if (a.y > b.y + b.height || b.y > a.y + a.height) {
        return false;
    }
    
    return true;
}

function collidesParam(x, y, width, height, b) {
    if (x > b.x + b.width || b.x > x + width) {
        return false;
    }
    
    if (y > b.y + b.height || b.y > y + height) {
        return false;
    }

    return true;
}

function updateCamera() {
    camera.x = player.position.x - camera.width / 2;
}

// Rayscan for a collision along their velocity vector
function rayscan(ent, fx, fy, magnitude) {
    for (var t = PARAMS.COLLISION.epsilon; t <= magnitude; t += PARAMS.COLLISION.epsilon) {
        let x = fx(t + PARAMS.COLLISION.epsilon);
        let y = fy(t + PARAMS.COLLISION.epsilon);
        
        for (var i = 0; i < platforms.length; i++) {
            var platform = platforms[i];
            // Do a collision check
            if (collidesParam(x, y, ent.width, ent.height, platform)) {
                return { collides: true, platform: platform, destX: fx(t), destY: fy(t) };
            }
        }
    }
    return { collides: false, destX: fx(magnitude), destY: fy(magnitude) };
}

function canMoveEntity(ent) {
    var magnitude = Math.sqrt(ent.position.vx * ent.position.vx + ent.position.vy * ent.position.vy);
    return magnitude != 0;
}

function getSideCollision(scanResult, ent, ny) {
    let collidesRight = collidesDir(scanResult, ent, 1, 0);
    let collidesLeft = collidesDir(scanResult, ent, -1, 0);

    // Choose the dominant direction to slide along the object in the y direction
    if ((collidesLeft || collidesRight) && !(collidesLeft && collidesRight)) {
        // Snap the entity's x-axis to the object where there is no repeated collision possible
        let snapX = collidesRight ? scanResult.platform.x - ent.width - 1: scanResult.platform.x + scanResult.platform.width + 1;
        
        // Scan only upward from the snapped position and find the first (x,y) with no collision
        return rayscan(ent,
            (t) => { return snapX }, 
            (t) => { return ent.position.y - Math.sign(ny) * t }, 
            Math.abs(ent.position.vy));
    }
    return scanResult;
}

function collidesDir(scanResult, ent, dx, dy) {
    return collidesParam(scanResult.destX + dx, scanResult.destY + dy, ent.width, ent.height, scanResult.platform)
}

function collidesAbove(scanResult, ent) {
    return collidesDir(scanResult, ent, 0, - PARAMS.COLLISION.epsilon);
}

function handleMoveCollision(scanResult, ent, ny) {
    if (ent.position.vy > 0 && collidesAbove(scanResult, ent)) {
        ent.position.vy = 0;
    }

    scanResult = getSideCollision(scanResult, ent, ny);
    ent.position.x = scanResult.destX;
    ent.position.y = scanResult.destY;
}

function moveEntRayscan(scanResult, ent, ny) {
    // If a collision exists, move to the previous point where no collision occurs
    if (scanResult.collides) {
        handleMoveCollision(scanResult, ent, ny);
    } else {
        ent.position.x += ent.position.vx;
        ent.position.y -= ent.position.vy;
    }
}

function moveEntity(ent) {
    var magnitude = Math.sqrt(ent.position.vx * ent.position.vx + ent.position.vy * ent.position.vy);

    var nx = ent.position.vx / magnitude;
    var ny = ent.position.vy / magnitude;

    // Rayscan for a collision along their velocity vector
    var scanResult = rayscan(ent,
        (t) => { return ent.position.x + nx * t }, 
        (t) => { return ent.position.y - ny * t }, 
        magnitude);

    moveEntRayscan(scanResult, ent, ny);
}

if (canvas) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    window.setInterval(loop, PARAMS.TICK_RATE);
}