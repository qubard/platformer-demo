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
        epsilon: 0.01  // ray cast collision epsilon (larger values more performant but less accurate)
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

var player = {
    x: 100,
    y: platforms[1].y - 50,
    width: 35,
    height: 35,
    vx : 0,
    vy : 0,
    color: "#FF0000",
    inAir: true
}

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
    rect(Math.floor(x - camera.x), Math.floor(y - camera.y), width, height, col); // Floor so that there's no weird aliasing
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
    }

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, player.color);

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

var k =0;

// Params: Entity to be moved
// Returns true if the entity was able to be moved
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

    var found = false;
    
    for (var t = PARAMS.COLLISION.epsilon; t <= magnitude + PARAMS.COLLISION.epsilon && !found; t += PARAMS.COLLISION.epsilon) {
        for (var i = 0; i < platforms.length; i++) {
            var platform = platforms[i];

            // Do a collision check
            if (collidesParam(sx + nx * t, sy - ny * t, ent.width, ent.height, platform)) {
                if(mint >= 0) {
                    found = true;
                    break;
                }

                if (mint < 0) {
                    collidedPlatform = platform;
                    mint = t;
                }
            }
        }
    }

    if(mint >= magnitude) {
        mint = magnitude;
    }
    
    // Check for collisions along ray, move to smallest collision point
    if (collidedPlatform) {
        // Find the first t where a collion doesn't occur with the collided platform (entity becomes stuck inside the object otherwise)
        for (var t = mint; t >= -PARAMS.COLLISION.epsilon; t -= PARAMS.COLLISION.epsilon) {
            let dx = nx * t;
            let dy = - ny * t;

            if (!collidesParam(sx + dx, sy + dy, ent.width, ent.height, collidedPlatform)) {
                // Player velocity should be reset in y if they're moving in the y-direction and they collide with something above them
                // The only way to check if we are colliding from underneath something is to try to go upward from a non-collided position
                // Negative is up
                if (ent.vy > 0 && collidesParam(sx + dx, sy + dy - PARAMS.COLLISION.epsilon, ent.width, ent.height, collidedPlatform)) {
                    ent.vy = 0;
                }

                let a = collidesParam(sx + dx + 1, sy + dy, ent.width, ent.height, collidedPlatform);
                let b = collidesParam(sx + dx - 1, sy + dy, ent.width, ent.height, collidedPlatform);

                // Choose the dominant direction to slide along the object in the y direction
                if(Math.abs(nx) > 0 && (a || b)) {
                    // Snap the entity's x-axis to the object where there is no repeated collision possible
                    let newx = a ? collidedPlatform.x - player.width - 1: collidedPlatform.x + collidedPlatform.width + 1;

                    // Need to scan up to magnitude again so we don't clip into it still (hilariously bad code)                   
                    let t = 0;
                    let found = false;
                    for(t = 0; t <= magnitude && !found; t += PARAMS.COLLISION.epsilon) {
                        for (var i = 0; i < platforms.length; i++) {
                            var platform = platforms[i];
                            if(collidesParam(newx, sy - Math.sign(ny) * t, ent.width, ent.height, platform)) {
                                found = true;
                                break;
                            }
                        }
                    }
                    if(!found) t = magnitude;
                    ent.y += - Math.sign(ny) * (t - PARAMS.COLLISION.epsilon);
                    ent.x = newx;
                } else {
                    ent.x += dx;
                    ent.y += dy;
                }

                return true;
            }
        }
        return false;
    }

    ent.x += ent.vx;
    ent.y -= ent.vy;
    
    return true;
}

if (canvas) {
    var ctx = canvas.getContext("2d");

    window.setInterval(loop, PARAMS.TICKRATE);
}