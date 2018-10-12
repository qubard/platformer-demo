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
    vx : 1,
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
    movePlayer();

    platforms.forEach(platform => {
        rectRelative(platform.x, platform.y, platform.width, platform.height, "#00FF00");
    });
        
    rectRelative(player.x, player.y, player.width, player.height, player.color);
    console.log(Date.now() - start, player.x - 100);
}

function doInput() {
    //player.vx = 0;
    player.vy = 0;
    
    if (keys[38]) {
        player.vy = 1;
    }

    if (keys[37]) {
        player.vx = -1;
    }

    if (keys[39]) {
        player.vx = 1;
    }

    if(keys[40]) {
        player.vy = -1;
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
    
    cPlayer.x += cPlayer.vx;
    cPlayer.y -= cPlayer.vy;

    for (var i = 0; i < platforms.length && !collidedPlatform; i++) {
        var platform = platforms[i];
        
        // Do a collision check
        if (collides(cPlayer, platform)) {
            collidedPlatform = platform;
            break;
        }
    }
    
    
    if (collidedPlatform) {
    // Snap to the platform and update their position
        cPlayer.vy = 0;
        player.color = "#FF0000";
    } else {
        player.color = "#0000FF";
        player = cPlayer; // do the assignment
    }

    camera.x = player.x - camera.width / 2;
}

if (canvas) {
    var ctx = canvas.getContext("2d");

    window.setInterval(loop, 25);
}