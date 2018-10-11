var canvas = document.getElementById("canvas");

var keys = {};

document.addEventListener('keydown', function(event) {
    keys[event.keyCode] = true;
    movePlayer();
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
    x: platforms[1].x + 5,
    y: platforms[1].y - 50,
    width: 35,
    height: 35,
    vx : 0,
    vy : 0,
    airborne: false
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

function loop() {
    rect(0, 0, camera.width, camera.height, "#FFFFFF");
    
    doInput();

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, "#FF0000");

    if(player.airborne) {
        player.vy -= GRAVITY;
    }
}

function doInput() {
    if (keys[38]) {
        player.vy += GRAVITY * 1.2;
        player.airborne = true;
    }

    if (keys[37]) {
        player.vx = -5;
    } else {
        if (!keys[39]) {
            player.vx = 0;
        }
    }

    if (keys[39]) {
        player.vx = 5;
    } else {
        if (!keys[37]) {
            player.vx = 0;
        }
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

function movePlayer() {
    var collidedPlatform = null;
    var cPlayer = Object.assign({}, player);
    
    var maxItr = Math.max(Math.abs(player.vx), Math.abs(player.vy));

    for (var i = 0; i < platforms.length && !collidedPlatform; i++) {
        var platform = platforms[i];
        
        // Do a collision scan
        let itr = 0;
        while (!(cPlayer.x == player.x + player.vx && cPlayer.y == player.y + player.vy) && itr <= maxItr) {
            cPlayer.x += Math.abs(cPlayer.vx)/cPlayer.vx;
            cPlayer.y += -Math.abs(cPlayer.vy)/cPlayer.vy;

            if (collides(cPlayer, platform)) {
                collidedPlatform = platform;
                break;
            }

            itr++;
        }
    }
    
    // Snap to the platform and update their position
    if (collidedPlatform) {
        
        let dy = collidedPlatform.y + collidedPlatform.height;

        // Check if the player isn't "standing" on the platform, upward
        if (cPlayer.vy > 0 && Math.abs(cPlayer.y - dy) > 1) {
            cPlayer.y = dy;
        }

        // Same check except downward
        dy = collidedPlatform.y - player.height;
        if (cPlayer.vy < 0 && Math.abs(cPlayer.y - dy) > 1) {
            cPlayer.y = dy;
        }

        cPlayer.airborne = false;
        cPlayer.vy = 0;
    } else {
        cPlayer.airborne = true;
    }
    
    player = cPlayer;
    camera.x = player.x - camera.width / 2;
}

if (canvas) {
    var ctx = canvas.getContext("2d");

    window.setInterval(loop, 25);
}