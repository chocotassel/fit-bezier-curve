
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

var balls = [
    { x: 50, y: 50,   radius: 20, vx: 200, vy: 0, mass: 1, restitution: 0.7, color: 'blue' },
    { x: 200, y: 100, radius: 20, vx: -150, vy: 0, mass: 1, restitution: 0.7, color: 'red' },
    { x: 20, y: 10,   radius: 20, vx: 200, vy: 0, mass: 1, restitution: 0.7, color: 'green' },
    { x: 60, y: 10,   radius: 20, vx: -300, vy: 0, mass: 1, restitution: 0.7, color: 'yellow' },
    { x: 80, y: 20,   radius: 20, vx: 400, vy: 0, mass: 1, restitution: 0.7, color: 'brown' },
    { x: 140, y: 20,  radius: 20, vx: -500, vy: 0, mass: 1, restitution: 0.7, color: 'skyblue' },
    { x: 220, y: 20,  radius: 20, vx: 600, vy: 0, mass: 1, restitution: 0.7, color: 'orange' },
    { x: 350, y: 20,  radius: 20, vx: -300, vy: 0, mass: 1, restitution: 0.7, color: 'purple' },
    { x: 400, y: 20,  radius: 20, vx: 400, vy: 0, mass: 1, restitution: 0.7, color: 'pink' },
];

var gravity = 981; // 重力加速度
var airResistance = 0.01; // 空气阻力系数
var startTime;
var runningTime = 0;
var duration = 10000; // 10秒

function update(deltaTime) {
    var dt = deltaTime / 1000; // 以秒为单位的时间差

    balls.forEach(ball => {
        // 更新速度
        ball.vx -= ball.vx * airResistance * dt;
        ball.vy += gravity * dt - ball.vy * airResistance * dt;

        // 更新位置
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // 碰到地面反弹
        if (ball.y + ball.radius > canvas.height) {
            ball.y = canvas.height - ball.radius;
            ball.vy *= -ball.restitution;
        }

        // 碰到左右墙壁反弹
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.vx *= -ball.restitution;
            if (ball.x + ball.radius > canvas.width) {
                ball.x = canvas.width - ball.radius;
            } else {
                ball.x = ball.radius;
            }
        }
    });

    checkCollisions();
}

function checkCollisions() {
    for (var i = 0; i < balls.length; i++) {
        for (var j = i + 1; j < balls.length; j++) {
            var ball1 = balls[i];
            var ball2 = balls[j];
            var dx = ball2.x - ball1.x;
            var dy = ball2.y - ball1.y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ball1.radius + ball2.radius) {
                // 碰撞处理
                var angle = Math.atan2(dy, dx);
                var sin = Math.sin(angle);
                var cos = Math.cos(angle);

                // 旋转球的位置
                var x1 = 0;
                var y1 = 0;
                var x2 = dx * cos + dy * sin;
                var y2 = dy * cos - dx * sin;

                // 旋转球的速度
                var vx1 = ball1.vx * cos + ball1.vy * sin;
                var vy1 = ball1.vy * cos - ball1.vx * sin;
                var vx2 = ball2.vx * cos + ball2.vy * sin;
                var vy2 = ball2.vy * cos - ball2.vx * sin;

                // 碰撞后的速度
                var vx1Final = ((ball1.mass - ball2.mass) * vx1 + 2 * ball2.mass * vx2) / (ball1.mass + ball2.mass);
                var vx2Final = ((ball2.mass - ball1.mass) * vx2 + 2 * ball1.mass * vx1) / (ball1.mass + ball2.mass);

                // 更新速度
                ball1.vx = vx1Final * cos - vy1 * sin;
                ball1.vy = vy1 * cos + vx1Final * sin;
                ball2.vx = vx2Final * cos - vy2 * sin;
                ball2.vy = vy2 * cos + vx2Final * sin;

                // 确保球不重叠
                var overlap = ball1.radius + ball2.radius - distance;
                ball1.x -= (overlap / 2) * cos;
                ball1.y -= (overlap / 2) * sin;
                ball2.x += (overlap / 2) * cos;
                ball2.y += (overlap / 2) * sin;
            }
        }
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制小球
    balls.forEach(ball => {
        // 绘制小球
        context.beginPath();
        context.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
        context.fillStyle = ball.color;
        context.fill();
        //context.stroke();
    });
}

function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    var deltaTime = timestamp - startTime - runningTime;
    lastTime = timestamp;
    runningTime += deltaTime;

    if (runningTime <= duration) {
        update(deltaTime);
        draw();
        requestAnimationFrame(animate);
    }
}

requestAnimationFrame(animate);