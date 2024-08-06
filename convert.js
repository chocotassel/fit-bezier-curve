import { fitCurve as fitCurve2, fitCubic as fitCubic2 } from './fit-curve2.js';
import { fitCurve as myFitCurve, createTangent } from './my-fit-curve.js';
import { fitCurve as myFitCurve2, fitCubic as myFitCubic2 } from './my-fit-curve2.js';
import { getBezierValue, getValue } from './predy.js';
import { findClosestPoint, convertBezier, myGetBezierValue, myGetValue, vecEqual, vecLength, vecSub } from './utils.js'
import { bezierPath } from './bezierPath.js'
import { ft } from './ml.js'

const seg = 10;
const MAX_SEGMENT_NUM = 2
const MAX_ERROR_3D = 0.03
const MIN_PRECISION = 0.000001
const MAX_CYCLE_NUM = 10


function isCopoint(pts, cps, dim) {
    const p = pts.slice(0, dim)
    for (let i = 0; i < cps.length; i += dim) {
      const cp = cps.slice(i, i + dim)
      if (vecEqual(p, cp)) return true
    }
    for (let i = 3; i < pts.length; i += dim) {
      const pt = pts.slice(i, i + dim)
      if (vecEqual(p, pt)) return true
    }
    return false
}

function convertBezierToPredy (bezierPath, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const result = [
      [], [],
      [], [], bezierPath[4]
    ]
    for (let n = 0; n < num; n++) {
        const slicedBezierPath = [
            bezierPath[0].slice(n * 2, n * 2 + 4),
            bezierPath[1].slice(n * 4, n * 4 + 4),
            bezierPath[2].slice(n * 3, n * 3 + 6),
            bezierPath[3].slice(n * 6, n * 6 + 6),
            bezierPath[4]
        ]
        
        const bp = cutBezierPath(slicedBezierPath, 1, segment)

        // test
        // drawPredyBezier(bp[0], bp[1], { s: 1, x: 0, y: 0, color: 'green', ps: 4, ls: 1 });
        // drawPredyBezier3d(bp[2], bp[3], { s: 1/3, x: -0.3, y: -0.3, color: 'green', ps: 5, ls: 1 });
        // for (let t = 0; t < 1; t += 0.001) {
        //     const out = getValue(t, [bp[0], bp[1], bp[2], bp[3], slicedBezierPath[4]], {
        //         range: [0, 1, 0, 1],
        //         segIndex: 0,
        //         y: 0
        //     });
        //     // draw(t, out.y, 'black', 1);
        //     // draw(out.out[0]/5-0.3, out.out[1]/5, 'black', 2);
        // }

        // result
        if (n !== 0) {
            bp[0].splice(0, 2);
            bp[2].splice(0, 3);
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);
        result[2].push(...bp[2]);
        result[3].push(...bp[3]);

    }
    console.log('result cv3', result[0].length/2-1, result);

    return result;
}


export function cutBezierPath (slicedBezierPath, type = 1, segment = 20) {
    let getValue1, getValue2, getBezierValue1, getBezierValue2

    // type 1: predy, 2: lottie
    if (type === 1) {
        getValue1 = myGetValue
        getValue2 = getValue
        getBezierValue1 = myGetBezierValue
        getBezierValue2 = getBezierValue
    } else {
        getValue1 = getValue
        getValue2 = myGetValue
        getBezierValue1 = getBezierValue
        getBezierValue2 = myGetBezierValue
    }

    const fc = []
    const fc3d = []
    const ts = []
    const ts3d = []
    
    const start = slicedBezierPath[0][0]
    const end = slicedBezierPath[0][slicedBezierPath[0].length - 2]
    const step = (end - start) / segment
    let lastP = [];
    let bezier3dLength = 0;
    let options = {
        range: [0, 1, 0, 1],
        segIndex: 0,
        y: 0
    };
    let t = start
    do {
        const { y, out, t1, t2 } = getValue1(t, slicedBezierPath, options)
        fc.push([t, y])
        fc3d.push(out)
        ts.push(t1)
        ts3d.push(t2)
        if (lastP.length) {
            bezier3dLength += vecLength(vecSub(out, lastP))
        }
        lastP = out
        t += step
        t = t > end && t < end + step ? end : t
    } while (t <= end)
        // console.log(ts, ts3d);
    
    // find best
    const isCopointFlag = isCopoint(slicedBezierPath[2], slicedBezierPath[3], 3)
    const precision = bezier3dLength / fc3d.length / 1000
    let bp
    let seg_num = 1
    let bc3d
    let cycle = 0
    do {
        // bc3d = myFitCurve2(type, fc3d, precision, seg_num++, ts3d)
        bc3d = isCopointFlag ? bc3d : myFitCurve2(type, fc3d, precision, seg_num, ts3d)
        const bp3dTemp = convertBezier(bc3d)
        const op = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0,
        }

        // seg ease curve
        const indices = [0]
        for (let j = 1; j < bc3d.length; j++) {
            const p = bc3d[j][0]
            const index = findClosestPoint(p, fc3d)
            indices.push(index)
        }
        indices.push(fc3d.length - 1)
        const beziers2d = []
        for (let i = 1; i < indices.length; i++) {
            const p0 = fc[indices[i - 1] - 1] || fc[0]
            let p1 = fc[indices[i - 1] + 1]
            let p2 = fc[indices[i] - 1]
            const p3 = fc[indices[i] + 1] || fc[fc.length - 1]
            const leftTangent = createTangent(p1, p0)
            const rightTangent = createTangent(p2, p3)
            const bs = myFitCubic2(type, fc.slice(indices[i - 1], indices[i] + 1), leftTangent, rightTangent, 0.000001, 0);
            beziers2d.push(...bs)
        }
        // beziers2d.map(b => {
        //     console.log('b', b);
        //     const f = (t) => getBezierValue(t, [...b[0], ...b[3]], [...b[1], ...b[2]], { range: [0, 1, 0, 1], segIndex: 0, y: 0 }).y
        //     calculateTangentPointCoordinates(f, b[1], (start + end) / 2)
        // })
        beziers2d.forEach(b => {
            // const f = t => getBezierValue2(t, b[0], b[1], op).y
            // console.log('b', b, slicedBezierPath);
            const mf = t => getBezierValue1(t, slicedBezierPath[0], slicedBezierPath[1], op).y
            ft(b, getBezierValue2, mf, precision, 200)
        })
        const bpTemp = convertBezier(beziers2d)
        bp = bpTemp
        if (beziers2d.length >= MAX_SEGMENT_NUM) break

        // calculate error
        let sumOfSquares = 0;
        fc3d.forEach((p, i) => {
            const { out } = getValue2(fc[i][0], [bpTemp[0], bpTemp[1], bp3dTemp[0], bp3dTemp[1], slicedBezierPath[4]], op)
            const diff = vecLength(vecSub(out, p))
            sumOfSquares += diff * diff
        })
        let meanSquareError = sumOfSquares / fc3d.length;
        let rmse = Math.sqrt(meanSquareError);
        // console.log('err', rmse, rmse / bezier3dLength, seg_num, bp, indices);
        if (rmse / bezier3dLength < MAX_ERROR_3D || rmse < MIN_PRECISION) break

        cycle++
        seg_num++
    } while (cycle < MAX_CYCLE_NUM)

    const bp3d = convertBezier(bc3d)

    return [bp[0], bp[1], bp3d[0], bp3d[1]]
}



// test
let now = performance.now();
const bp = convertBezierToPredy(bezierPath)
console.log('convert 3', performance.now() - now, bp);
export const convertedBezierPath = bp;
drawPredyBezier(bp[0], bp[1], {
  color: 'green',
  ps: 2,
  ls: 1
})
// drawPredyBezier3d(bp[2], bp[3], {
//   color: 'green',
//   ps: 5,
//   ls: 2,
//   s: 1/3,
//   x: -0.3,
//   y: -0.3
// })

const op = {
    range: [0, 1, 0, 1],
    segIndex: 0,
    y: 0
}; 

let add = 0
let lastP = [];
for (let t = 0; t < 1; t += 0.001) {
    const tout2 = getValue(t, bezierPath, op);
    // draw(t, tout2.y, 'green', 1);
    // draw(tout2.out[0]/3-0.3, tout2.out[1]/3-0.3, 'red', 2);

    const out = tout2.out
    if (lastP.length) {
        add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
    }
    // draw(t*3, add*0.06, 'red', 1);
    lastP = out;
}
add = 0
lastP = [];
for (let t = 0; t < 1; t += 0.001) {
    const tout2 = getValue(t, bp, op);
    draw(...transformEase([t, tout2.y]), 'green', 0.3);
    const p3d = transformPath([tout2.out[0], tout2.out[1]])
    draw(p3d[0] - 0.1, p3d[1], 'green', 2);

    const out = tout2.out
    if (lastP.length) {
        add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
    }
    draw(...transformAcc([t, add]), 'green', 1);
    lastP = out;
}
