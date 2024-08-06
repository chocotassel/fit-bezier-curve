import { getBezierValue } from './predy.js'

const MaxIterations = 20

export function fineTurning(bezier, err, points) {
    let p0 = bezier[0]
    let p1 = bezier[1]
    let p2 = bezier[2]
    let p3 = bezier[3]

    const ab = calculateLineParameters(p0[0], p0[1], p3[0], p3[1])
    const kab = -ab.A / ab.B

    for (let n = 0; n < MaxIterations; n++) {
        let b1, b2
        let minDistance1 = Number.MAX_VALUE
        let minDistance2 = Number.MAX_VALUE
        const lineC = calculateLineParametersFromSlope(p1[0], p1[1], -1 / kab)
        const lineD = calculateLineParametersFromSlope(p2[0], p2[1], -1 / kab)

        for (let t = 0; t < 1; t += 0.01) {
            const out = getBezierValue(t, [...p0, ...p3], [...p1, ...p2], { range: [0, 1, 0, 1], segIndex: 0, y: 0 })
            let d = distanceFromPointToLine(t, out.y, lineC)
            if (d < minDistance1) {
                minDistance1 = d
                b1 = [t, out.y]
            }
            d = distanceFromPointToLine(t, out.y, lineD)
            if (d < minDistance2) {
                minDistance2 = d
                b2 = [t, out.y]
            }
        }
        if (minDistance1 < err && minDistance2 < err) {
            return [p0, p1, p2, p3]
        }

        let mb1, mb2
        minDistance1 = Number.MAX_VALUE
        minDistance2 = Number.MAX_VALUE
        points.forEach((p, i) => {
            let d = distanceFromPointToLine(p[0], p[1], lineC)
            if (d < minDistance1) {
                minDistance1 = d
                mb1 = p
            }
            d = distanceFromPointToLine(p[0], p[1], lineD)
            if (d < minDistance2) {
                minDistance2 = d
                mb2 = p
            }
        })

        const v1 = vecSub(mb1, b1)
        const v2 = vecSub(mb2, b2)
        p1 = vecAdd(p1, v1)
        p2 = vecAdd(p2, v2)
    }
    return [p0, p1, p2, p3]
}

/**
 * 计算通过两个点的直线的参数 A, B, C
 * @param {number} x1 - 第一个点的 x 坐标
 * @param {number} y1 - 第一个点的 y 坐标
 * @param {number} x2 - 第二个点的 x 坐标
 * @param {number} y2 - 第二个点的 y 坐标
 * @returns {Object} 直线方程 Ax + By + C = 0 的参数 { A, B, C }
 */
function calculateLineParameters(x1, y1, x2, y2) {
    const A = y2 - y1;
    const B = x1 - x2;
    const C = x2 * y1 - x1 * y2;
    return { A, B, C };
}

/**
 * 计算通过一个点和斜率的直线的参数 A, B, C
 * @param {number} x0 - 点的 x 坐标
 * @param {number} y0 - 点的 y 坐标
 * @param {number} m - 直线的斜率
 * @returns {Object} 直线方程 Ax + By + C = 0 的参数 { A, B, C }
 */
function calculateLineParametersFromSlope(x0, y0, m) {
    const A = m;
    const B = -1;
    const C = y0 - m * x0;
    return { A, B, C };
}

/**
 * 计算二维坐标点到直线的距离
 * @param {number} x0 - 点的x坐标
 * @param {number} y0 - 点的y坐标
 * @param {number} A - 直线方程Ax + By + C = 0中的A
 * @param {number} B - 直线方程Ax + By + C = 0中的B
 * @param {number} C - 直线方程Ax + By + C = 0中的C
 * @returns {number} 点到直线的距离
 */
function distanceFromPointToLine(x0, y0, l) {
    return Math.abs(l.A * x0 + l.B * y0 + l.C) / Math.sqrt(l.A * l.B + l.B * l.B);
}

/**
 * 计算一个点到一直线的垂线的交点
 * @param {number} x0 - 点的 x 坐标
 * @param {number} y0 - 点的 y 坐标
 * @param {number} A - 直线方程 Ax + By + C = 0 中的 A
 * @param {number} B - 直线方程 Ax + By + C = 0 中的 B
 * @param {number} C - 直线方程 Ax + By + C = 0 中的 C
 * @returns {Object} 垂线交点的坐标 { x, y }
 */
function calculatePerpendicularFoot(x0, y0, A, B, C) {
    // 计算垂线的交点
    const D = A * A + B * B;
    const x = (B * (B * x0 - A * y0) - A * C) / D;
    const y = (A * (-B * x0 + A * y0) - B * C) / D;
    return { x, y };
}

function vecAdd(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1]]
}

function vecSub(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1]]
}



// // 数值求导，使用有限差分法
// function numericalDerivative(f, x, h = 1e-3) {
//     return (f(x + h) - f(x - h)) / (2 * h);
// }

// // 牛顿迭代法，找到切点
// function findTangentPoint(f, x0, y0, initialGuess, tolerance = 1e-5, maxIterations = 100) {
//     let x1 = initialGuess;
//     for (let i = 0; i < maxIterations; i++) {
//         let y1 = f(x1);
//         let slope = numericalDerivative(f, x1);
//         let normalSlope = -1 / slope;
        
//         // 更新切点的x坐标
//         let xNew = (normalSlope * x1 - y1 + y0 + x0 / normalSlope) / (normalSlope + 1 / normalSlope);
        
//         console.log(y1, xNew);
//         if (Math.abs(xNew - x1) < tolerance) {
//             return { x: x1, y: y1 };
//         }
        
//         x1 = xNew;
//     }
//     throw new Error("找不到切点，迭代未收敛");
// }

// // 计算切点的坐标
// export function calculateTangentPointCoordinates(f, p, initialGuess) {
//     let tangentPoint = findTangentPoint(f, p[0], p[1], initialGuess);
//     return tangentPoint;
// }


export function ft (bezier, f, mf, precision, segment = 100) {
    let p0 = bezier[0]
    let p1 = bezier[1]
    let p2 = bezier[2]
    let p3 = bezier[3]

    const start = p0[0]
    const end = p3[0]
    const step = (end - start) / segment
    let cycle = 0

    function createLut (f) {
        let lut = []
        let length = 0
    
        let lastP = []
    
        let t = start
        do {
            const y = f(t)
    
            if (lastP.length) {
                const dy = y - lastP[1]
                length += Math.hypot(dy, step)
            }
            lut.push([length, [t, y]])
            lastP = [t, y]
            t += step
            t = t > end && t < end + step ? end : t
        } while (t <= end)
        lut.forEach(l => l[0] /= length)
    
        return { lut, length }
    }
    
    const { lut: lut2, length: length2 } = createLut(mf)

    do {
        const tempf = t => f(t, [...p0, ...p3], [...p1, ...p2], { range: [0, 1, 0, 1], segIndex: 0, y: 0 }).y
        const { lut: lut1, length: length1} = createLut(tempf)
        
    
        const vec1 = [0, 0]
        const vec2 = [0, 0]
        const step2 = 10 / segment
        let sumOfSquares = 0;
        let i = 0
        do {
            const p1 = findClosestPoint(i, lut1)
            const p2 = findClosestPoint(i, lut2)
            const w1 = 3 * i * (1 - i) ** 2
            const w2 = 3 * (1 - i) * i ** 2
            vec1[0] += (p2[0] - p1[0]) * w1 * step2 * 2
            vec1[1] += (p2[1] - p1[1]) * w1 * step2 * 2
            vec2[0] += (p2[0] - p1[0]) * w2 * step2 * 2
            vec2[1] += (p2[1] - p1[1]) * w2 * step2 * 2

            const diff = Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
            sumOfSquares += diff * diff
            i += step2
            i = i > end && i < end + step2 ? end : i
        } while (i <= 1)
        
        // console.log('vec', vec1, vec2, length1, length2);

        let meanSquareError = sumOfSquares * step2;
        let rmse = Math.sqrt(meanSquareError);
        console.log('vec err', rmse);
        if (rmse < precision / 2) break
    
        p1[0] += vec1[0]
        p1[1] += vec1[1]
        p2[0] += vec2[0]
        p2[1] += vec2[1]

        cycle++
    } while (cycle < 15)

}

function findClosestPoint(p, lut) {
    let min = Number.MAX_VALUE
    let index = 0
    lut.forEach((l, i) => {
        const d = Math.abs(l[0] - p)
        if (d < min) {
            min = d
            index = i
        }
    })
    return lut[index][1]
}
