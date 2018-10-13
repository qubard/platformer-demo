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

var GRAVITY = 2; // 9.8m/s^2

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
    color: "#FF0000"
}

var camera = {
    x: 0,
    y: 0,
    width: 900,
    height: 800
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

var start = Date.now();

function loop() {
    rect(0, 0, camera.width, camera.height, "#FFFFFF");
    
    doInput();
    
    // use 100 segments to raycast moving the player
    if(moveEntity(player)) {
        updateCamera();
    }

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, player.color);
}

function doInput() {
    player.vx = 0;
    player.vy = 0;
    
    if (keys[38]) {
        player.vy = 5;
    }

    if (keys[37]) {
        player.vx = -5;
    }

    if (keys[39]) {
        player.vx = 5;
    }

    if(keys[40]) {
        player.vy = -5;
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

    if(magnitude == 0) {
        return false;
    }

    var sx = ent.x;
    var sy = ent.y;
    var nx = ent.vx / magnitude;
    var ny = ent.vy / magnitude;

    var mint = -1;

    var segSize = 0.01;

    var collidedPlatform = null;
    
    for(var t = 0; t < magnitude; t += segSize) {
        for (var i = 0; i < platforms.length; i++) {
            var platform = platforms[i];

            // Do a collision check
            if (collidesParam(sx + nx * t, sy - ny * t, ent.width, ent.height, platform)) {
                collidedPlatform = platform;
                if(mint < 0) {
                    mint = t;
                }
                mint = Math.min(t, mint);
            }
        }
    }
    
    // Collision along ray, move to smallest collision point
    if(collidedPlatform) {
        // Find the first t where a collion doesn't occur with the collided platform (entity becomes stuck inside the object otherwise)
        for(var t = mint; t >= -segSize; t -= segSize) {
            if(!collidesParam(sx + nx * t, sy - ny * t, ent.width, ent.height, collidedPlatform)) {
                ent.x += nx * t;
                ent.y -= ny * t;
                break;
            }
        }
    } else {
        // No collision along ray, move the player
        ent.x += ent.vx;
        ent.y -= ent.vy;
    }

    return true;
}

if (canvas) {
    var ctx = canvas.getContext("2d");

    window.setInterval(loop, 25);
}