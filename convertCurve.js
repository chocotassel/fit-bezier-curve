import { fitCurve as fitCurve2, fitCubic as fitCubic2 } from './fit-curve2.js';
import { fitCurve as myFitCurve, createTangent } from './my-fit-curve.js';
import { fitCurve as myFitCurve2, fitCubic as myFitCubic2 } from './my-fit-curve2.js';
import { getBezierValue, getValue } from './predy.js';
import { findClosestPoint, convertBezier, myGetBezierValue, myGetValue, vecEqual, vecLength, vecSub } from './utils.js'
import { bezierCurve } from './bezierCurve.js'
import { fineTurning, ft } from './ml.js';

const seg = 10;
const MAX_SEGMENT_NUM = 1
const MAX_ERROR_2D = 0.01
const MAX_CYCLE_NUM = 10


function isCopoint(pts, cps, dim) {
    const p = pts.slice(0, dim)
    for (let i = 0; i < cps.length; i += dim) {
      const cp = cps.slice(i, i + dim)
      if (vecEqual(p, cp)) return true
    }
    for (let i = dim; i < pts.length; i += dim) {
      const pt = pts.slice(i, i + dim)
      if (vecEqual(p, pt)) return true
    }
    return false
}

function convertBezierCurveToPredy (bezierCurve, segment = seg) {
    const num = bezierCurve[0].length / 2 - 1;
    const result = [
      [], [], bezierCurve[2]
    ]
    for (let n = 0; n < num; n++) {
        const slicedBezierPath = [
            bezierCurve[0].slice(n * 2, n * 2 + 4),
            bezierCurve[1].slice(n * 4, n * 4 + 4),
            bezierCurve[2]
        ]
        
        const bp = cutBezierCurve(slicedBezierPath, 1, segment)

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
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);

    }
    // console.log('result cv3', result[0].length/2-1, result);

    return result;
}


export function cutBezierCurve (slicedBezierPath, type = 1, segment = 20) {
    let getBezierValue1, getBezierValue2

    // type 1: predy, 2: lottie
    if (type === 1) {
        getBezierValue1 = myGetBezierValue
        getBezierValue2 = getBezierValue
    } else {
        getBezierValue1 = getBezierValue
        getBezierValue2 = myGetBezierValue
    }

    const fc = []
    const ts = []
    
    const start = slicedBezierPath[0][0]
    const end = slicedBezierPath[0][slicedBezierPath[0].length - 2]
    const step = (end - start) / segment
    let bezierLength = 0;
    let lastY = -1;
    let options = {
        range: [0, 1, 0, 1],
        segIndex: 0,
        y: 0
    };
    let t = start
    do {
        const { y, t1 } = getBezierValue1(t, slicedBezierPath[0], slicedBezierPath[1], options)
        fc.push([t, y])
        ts.push(t1)
        if (lastY >= 0) {
            bezierLength += Math.sqrt(step ** 2 + (y - lastY) ** 2)
        }
        lastY = y
        t += step
        t = t > end && t < end + step ? end : t
    } while (t <= end)
    
    // find best
    const precision = bezierLength / fc.length / 100
    let bc = [slicedBezierPath[0], slicedBezierPath[1]]
    let seg_num = 1
    let cycle = 0
    // console.log('t', ts, fc, precision, isCopointFlag, bezierLength);
    do {
        const op = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0,
        }
        // bc = isCopointFlag ? bc : convertBezier(myFitCurve2(type, fc, precision, seg_num++))
        const beziers = myFitCurve2(type, fc, precision, seg_num)
        beziers.forEach(b => {
            // const f = t => getBezierValue2(t, b[0], b[1], op).y
            // console.log('b', b, slicedBezierPath);
            const mf = t => getBezierValue1(t, slicedBezierPath[0], slicedBezierPath[1], op).y
            ft(b, getBezierValue, mf, MAX_ERROR_2D, 200)
        })
        bc = convertBezier(beziers)
        console.log('bc', bc, bc[1].length / 4);

        // calculate error
        let sumOfSquares = 0;
        fc.forEach((p, i) => {
            const { y } = getBezierValue2(fc[i][0], bc[0], bc[1], op)
            const diff = Math.abs(y - p[1])
            sumOfSquares += diff * diff
        })
        let meanSquareError = sumOfSquares / fc.length;
        let rmse = Math.sqrt(meanSquareError);
        console.log('err', rmse);
        if (bc[1].length / 4 >= MAX_SEGMENT_NUM) break
        if (rmse < MAX_ERROR_2D) break

        cycle++
        seg_num++
    } while (cycle < MAX_CYCLE_NUM)

    return [bc[0], bc[1]]
}



// test
let now = performance.now();
const bc = convertBezierCurveToPredy(bezierCurve)
console.log('convert curve', performance.now() - now, bc);
// export const convertedBezierPath = bp;
drawPredyBezier(bc[0], bc[1], {
  color: 'blue',
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

for (let t = 0; t < 1; t += 0.001) {
    const { y, t1 } = myGetBezierValue(t, bezierCurve[0], bezierCurve[1], op);
    draw(t, y, 'orange', 0.5);
}

for (let t = 0; t < 1; t += 0.001) {
    const { y, t1 } = getBezierValue(t, bc[0], bc[1], op);
    draw(t, y, 'blue', 0.5);
}
