import { fitCurve } from '../fit-curve.js';
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

var ball = {
    x: 50,
    y: 50,
    radius: 20,
    vx: 200, // 初始水平速度
    vy: 0, // 初始垂直速度
    mass: 1,
    restitution: 0.7, // 反弹系数
};

var gravity = 981; // 重力加速度
var airResistance = 0.01; // 空气阻力系数

var startTime;
var runningTime = 0;
var duration = 10000; // 10秒

function update(deltaTime) {
    var dt = deltaTime / 1000; // 以秒为单位的时间差

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
}

function draw() {
    //context.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制小球
    context.beginPath();
    context.arc(ball.x, ball.y, ball.radius / 10, 0, 2 * Math.PI);
    context.fillStyle = 'blue';
    context.fill();
    context.stroke();
}

// function animate(timestamp) {
//     if (!startTime) startTime = timestamp;
//     var deltaTime = timestamp - startTime - runningTime;
//     runningTime += deltaTime;

//     if (runningTime <= duration) {
//         update(deltaTime);
//         draw();
//         requestAnimationFrame(animate);
//     }
// }

// requestAnimationFrame(animate);

const pts = [];
for (let t = 0; t < 1060; t+=16.67) {
    if (!startTime) startTime = t;
    var deltaTime = t - startTime - runningTime;
    runningTime += deltaTime;
    if (runningTime <= duration) {
        update(deltaTime);
        pts.push([ball.x, ball.y]);
        draw();
    }
}
const curve = fitCurve(pts, 100);
const size = 5
curve.forEach(b => {
    // context.beginPath();
    // context.arc(b[0][0], b[0][1], size, 0, 2 * Math.PI);
    // context.arc(b[3][0], b[3][1], size, 0, 2 * Math.PI);
    // context.fillStyle = 'red';
    // context.fill();
    // context.beginPath();
    // context.arc(b[1][0], b[1][1], size, 0, 2 * Math.PI);
    // context.arc(b[2][0], b[2][1], size, 0, 2 * Math.PI);
    // context.fillStyle = 'green';
    // context.fill();

    // context.beginPath();
    // context.moveTo(b[0][0], b[0][1]);
    // context.lineTo(b[1][0], b[1][1]);
    // context.strokeStyle = 'green';
    // context.stroke();
    // context.beginPath();
    // context.moveTo(b[2][0], b[2][1]);
    // context.lineTo(b[3][0], b[3][1]);
    // context.strokeStyle = 'green';
    // context.stroke();

    // context.beginPath();
    // context.moveTo(b[0][0], b[0][1]);
    // context.bezierCurveTo(b[1][0], b[1][1], b[2][0], b[2][1], b[3][0], b[3][1]);
    // context.strokeStyle = 'red';
    // context.stroke();
    // drawBezier(b[0], b[1], b[2], b[3]);
})

// 计算贝塞尔曲线上的点
function cubicBezier(t, p0, p1, p2, p3) {
    var x = Math.pow(1 - t, 3) * p0[0] + 3 * Math.pow(1 - t, 2) * t * p1[0] + 3 * (1 - t) * Math.pow(t, 2) * p2[0] + Math.pow(t, 3) * p3[0];
    var y = Math.pow(1 - t, 3) * p0[1] + 3 * Math.pow(1 - t, 2) * t * p1[1] + 3 * (1 - t) * Math.pow(t, 2) * p2[1] + Math.pow(t, 3) * p3[1];
    return [x, y];
}

function drawBezier(p0, p1, p2, p3) {
    var steps = 50; // 细分步数
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var point = cubicBezier(t, p0, p1, p2, p3);
        context.beginPath();
        context.arc(point[0], point[1], 2, 0, 2 * Math.PI);
        context.fillStyle = 'red';
        context.fill();
    }

    context.stroke();
}