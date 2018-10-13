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
        epsilon: 0.1  // ray cast collision epsilon (larger values more performant but less accurate)
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
    makePlatform(100, 600, 800, 50),
    makePlatform(150, 400, 100, 50)
]

var player = {
    x: 100,
    y: platforms[1].y - 50,
    width: 35,
    height: 35,
    vx : 0,
    vy : 0,
    color: "#FF0000",
}

function inAir() {
    for (var i = 0; i < platforms.length; i++) {
        var platform = platforms[i];
        if (collidesParam(player.x, player.y + 1, player.width, player.height, platform)) {
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
    rect(x - camera.x, y - camera.y, width, height, col);
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
    }

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, player.color);

    // Can't decrement y-velocity constantly because it causes magnitude of <vx, vy> to blow up
    if (inAir()) {
        player.vy -= PARAMS.PHYSICS.GRAVITY;
    } else {
        player.vy = 0;
    }

    player.color = inAir() ? "#FFFF00" : "#FF0000";
}

function doInput() {
    player.vx = 0;
    
    if (keys[38] && !inAir()) {
        player.vy = 30;
    }

    if (keys[37]) {
        player.vx -= 2;
    }

    if (keys[39]) {
        player.vx += 2;
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

function moveEntity(ent) {
    var magnitude = Math.sqrt(ent.vx * ent.vx + ent.vy * ent.vy);

    if (magnitude == 0) {
        return false;
    }

    var sx = ent.x;
    var sy = ent.y;
    var nx = ent.vx / magnitude;
    var ny = ent.vy / magnitude;

    var mint = -1;

    var collidedPlatform = null;
    
    for (var t = PARAMS.COLLISION.epsilon; t < magnitude; t += PARAMS.COLLISION.epsilon) {
        for (var i = 0; i < platforms.length; i++) {
            var platform = platforms[i];

            // Do a collision check
            if (collidesParam(sx + nx * t, sy - ny * t, ent.width, ent.height, platform)) {
                if (mint < 0 || t < mint) {
                    collidedPlatform = platform;
                    mint = t;
                }
            }
        }
    }
    
    // Check for collisions along ray, move to smallest collision point
    if (collidedPlatform) {
        // Find the first t where a collion doesn't occur with the collided platform (entity becomes stuck inside the object otherwise)
        for (var t = mint; t >= -PARAMS.COLLISION.epsilon; t -= PARAMS.COLLISION.epsilon) {
            let dy = - ny * t;
            if (!collidesParam(sx + nx * t, sy + dy, ent.width, ent.height, collidedPlatform)) {
                // If the we're moving down, we know the player has hit a platform
                ent.x += nx * t;
                ent.y += dy;
                return true;
            }
        }
    } else {
        // No collision along ray, move the player
        ent.x += ent.vx;
        ent.y -= ent.vy;
        return true;
    }

    return false;
}

if (canvas) {
    var ctx = canvas.getContext("2d");

    window.setInterval(loop, PARAMS.TICKRATE);
}