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

var PARAMS = {
    COLLISION: {
        epsilon: 0.1  // small value for ray scanning set to 10^i s.t i <= 0
    },
    PHYSICS: {
        GRAVITY: 2
    },
    TICKRATE: 25,
    WIDTH: 900,
    HEIGHT: 800
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

var player = makePlayer();

function emitMoveEvent() {
    socket.emit('player.move', player);
}

emitMoveEvent();

function inAir(ent) {
    for (var i = 0; i < platforms.length; i++) {
        var platform = platforms[i];
        if (collidesParam(ent.x, ent.y + 1, ent.width, ent.height, platform)) {
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
    
    if (moveEntity(player)) {
        updateCamera();
        player.inAir = inAir(player);
        emitMoveEvent();
    }

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, player.color);

    for (uuid in players) {
        let player = players[uuid];
        rectRelative(player.x, player.y, player.width, player.height, player.color);
    }

    // Can't decrement y-velocity constantly because it causes magnitude of <vx, vy> to blow up
    if (player.inAir) {
        player.vy -= PARAMS.PHYSICS.GRAVITY;
    } else {
        player.vy = 0;
    }

    player.color = player.inAir ? "#FFFF00" : "#FF0000";
}

function doInput() {
    player.vx = 0;
    
    if (keys[38] && !player.inAir) {
        player.vy = 30;
    }

    if (keys[37]) {
        player.vx -= 5;
    }

    if (keys[39]) {
        player.vx += 5;
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
    camera.x = player.x - camera.width / 2;
}

// Rayscan for a collision along their velocity vector
function rayscan(ent, fx, fy, magnitude) {
    for (var t = PARAMS.COLLISION.epsilon; t <= magnitude; t += PARAMS.COLLISION.epsilon) {
        let x = fx(ent, t + PARAMS.COLLISION.epsilon);
        let y = fy(ent, t + PARAMS.COLLISION.epsilon);
        
        for (var i = 0; i < platforms.length; i++) {
            var platform = platforms[i];
            // Do a collision check
            if (collidesParam(x, y, ent.width, ent.height, platform)) {
                return { collides: true, platform: platform, destX: fx(ent, t), destY: fy(ent, t) };
            }
        }
    }
    return { collides: false, destX: fx(ent, magnitude), destY: fy(ent, magnitude) };
}

// Params: Entity to be moved
// Returns true if the entity was able to be moved and updates its position
function moveEntity(ent) {
    var magnitude = Math.sqrt(ent.vx * ent.vx + ent.vy * ent.vy);

    if (magnitude == 0) {
        return false;
    }

    var nx = ent.vx / magnitude;
    var ny = ent.vy / magnitude;

    // Rayscan for a collision along their velocity vector
    var scanResult = rayscan(ent, 
        (ent, t) => { return ent.x + nx * t }, 
        (ent, t) => { return ent.y - ny * t }, 
        magnitude);

    // If a collision exists, move to the previous point where no collision occurs
    if (scanResult.collides) {
        let collidedPlatform = scanResult.platform;

        // Entity velocity should be reset in y if they're moving in the y-direction and they collide with something above them
        // The only way to check if we are colliding from underneath something is to try to go upward from a non-collided position (negative is up)
        if (ent.vy > 0 && collidesParam(scanResult.destX, scanResult.destY - PARAMS.COLLISION.epsilon, ent.width, ent.height, collidedPlatform)) {
            ent.vy = 0;
            emitMoveEvent();
        }

        let collidesRight = collidesParam(scanResult.destX + 1, scanResult.destY, ent.width, ent.height, collidedPlatform);
        let collidesLeft = collidesParam(scanResult.destX - 1, scanResult.destY, ent.width, ent.height, collidedPlatform);

        // Choose the dominant direction to slide along the object in the y direction
        if ((collidesLeft || collidesRight) && !(collidesLeft && collidesRight)) {
            // Snap the entity's x-axis to the object where there is no repeated collision possible
            let snapX = collidesRight ? collidedPlatform.x - ent.width - 1: collidedPlatform.x + collidedPlatform.width + 1;
            
            // Scan only upward from the snapped position and find the first (x,y) with no collision
            scanResult = rayscan(ent,
                (ent, t) => { return snapX }, 
                (ent, t) => { return ent.y - Math.sign(ny) * t }, 
                Math.abs(ent.vy));
        }

        ent.x = scanResult.destX;
        ent.y = scanResult.destY;
    } else {
        ent.x += ent.vx;
        ent.y -= ent.vy;
    }

    return true;
}

if (canvas) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    window.setInterval(loop, PARAMS.TICKRATE);
}