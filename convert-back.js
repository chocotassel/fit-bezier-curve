import { fitCurve } from './fit-curve.js';
import { fitCurve as fitCurve2 } from './fit-curve2.js';
import { getBezierValue, getValue } from './predy.js';
import { calculateAngle, convertBezier, deCasteljauSplit, myGetBezierValue, myGetValue, vecLength, percentSplit, findClosestPoint, vecSub } from './convert.js'
import { bezierPath } from './bezierPath.js'
import { convertedBezierPath, cutBezierPath } from './convert3.js'

const seg = 20;


// convert
function convertBezierTolottie (bezierPath, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const result = [
        [], [],
        [], [],
        bezierPath[4]
    ]

    const bis = [0]
    for (let i = 1; i < num; i++) {
        const p = bezierPath[0].slice(2 * i, 2 * i + 2);
        const c1 = bezierPath[1].slice(4 * i - 2, 4 * i);
        const c2 = bezierPath[1].slice(4 * i, 4 * i + 2);
        // console.log('c', Math.abs(calculateAngle(c1, c2, p)));
        if (Math.abs(calculateAngle(c1, c2, p) - Math.PI) > 0.02) {
            bis.push(i)
            continue
        }
        const p3d = bezierPath[2].slice(3 * i, 3 * i + 3);
        const c13d = bezierPath[3].slice(6 * i - 3, 6 * i);
        const c23d = bezierPath[3].slice(6 * i, 6 * i + 3);
        if (Math.abs(calculateAngle(c13d, c23d, p3d) - Math.PI) > 0.02) {
            bis.push(i)
        }
    }
  
    bis.forEach((n, i) => {
        let slicedBezierPath = []
        if (bis[i + 1] === undefined) {
            slicedBezierPath = [
                bezierPath[0].slice(n * 2),
                bezierPath[1].slice(n * 4),
                bezierPath[2].slice(n * 3),
                bezierPath[3].slice(n * 6),
                bezierPath[4]
            ]
        } else {
            slicedBezierPath = [
                bezierPath[0].slice(n * 2, bis[i + 1] * 2 + 2),
                bezierPath[1].slice(n * 4, bis[i + 1] * 4),
                bezierPath[2].slice(n * 3, bis[i + 1] * 3 + 3),
                bezierPath[3].slice(n * 6, bis[i + 1] * 6),
                bezierPath[4]
            ]
        }
        // const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]];
        // const pEnd = [slicedBezierPath[0][slicedBezierPath[0].length - 2], slicedBezierPath[0][slicedBezierPath[0].length - 1]];

        // const fc = []
        // const fc3d = []
        // const options = {
        //     range: [0, 1, 0, 1],
        //     segIndex: 0,
        //     y: 0
        // };
        // let lastP = [];
        // let bezier3dLength = 0;
        // for (let t = pStart[0]; t <= pEnd[0]; t += step) {
        //     t = parseFloat(t.toFixed(6))
        //     const { y, out } = getValue(t, slicedBezierPath, options);
        //     fc.push([t, y]);
        //     fc3d.push(out);
        //     if (lastP.length) {
        //         bezier3dLength += vecLength(vecSub(out, lastP))
        //     }
        //     lastP = out;
        // }
    
        // // fit
        // let seg_num = 1
        // let bc3d
        // let cycle = 0
        // do {
        //     bc3d = fitCurve2(fc3d, 0.0001, seg_num++)
        //     const bpTemp = convertBezier(bc3d)
        //     const op = {
        //         range: [0, 1, 0, 1],
        //         segIndex: 0,
        //         y: 0,
        //     }
            
        //     // calculate error
        //     let sumOfSquares = 0;
        //     fc3d.forEach((p, i) => {
        //         const { out } = myGetValue(fc[i][0], [slicedBezierPath[0], slicedBezierPath[1], bpTemp[0], bpTemp[1], slicedBezierPath[4]], op)
        //         const diff = vecLength(vecSub(out, p))
        //         sumOfSquares += diff * diff
        //     })
        //     let meanSquareError = sumOfSquares / fc3d.length;
        //     let rmse = Math.sqrt(meanSquareError);
        //     console.log('r', rmse);
        //     if (rmse / bezier3dLength < MAX_ERROR_3D) break
        //     cycle++
        // } while (bc3d.length < slicedBezierPath[0].length / 2 - 1 && cycle < 5)

        // const bp3d = convertBezier(bc3d)

        // // split 2d
        // const tv = []
        // for (let j = 1; j < bc3d.length; j++) {
        //     const p = bc3d[j][0]
        //     const index = findClosestPoint(p, fc3d)
        //     tv.push(fc[index][0])
        // }

        // const bc = fitCurve2(fc, 0.000001, 1)
        // const bp = convertBezier(bc)
        // const [pts, cps] = tv.length ? percentSplit(bp[0], bp[1], tv) : [bp[0], bp[1]];

        // if (n !== 0) {
        //     pts.splice(0, 2);
        //     bp3d[0].splice(0,3);
        // }
        // result[0].push(...pts);
        // result[1].push(...cps);
        // result[2].push(...bp3d[0]);
        // result[3].push(...bp3d[1]);


        // bp test
        // for (let t = 0; t < 1; t += step) {
        //     const out = myGetBezierValue(t, bp[0], bp[1], options);
        //     const y = out.y;
        //     draw(t+0.1, y, 'green', 1);
        // }

        
        const bp = cutBezierPath(slicedBezierPath, 2, segment)

        // result
        if (n !== 0) {
            bp[0].splice(0, 2);
            bp[2].splice(0, 3);
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);
        result[2].push(...bp[2]);
        result[3].push(...bp[3]);
    })

    return result;
}


// const bez = convertedBezierPath
// draw(bez[0][0] , bez[0][1], 'black', 8);
// draw(bez[0][2] , bez[0][3], 'black', 8);
// draw(bez[1][0] , bez[1][1], 'black', 8);
// draw(bez[1][2] , bez[1][3], 'black', 8);
// drawLine(bez[0][0], bez[0][1], bez[1][0], bez[1][1], 'black', 1);
// drawLine(bez[0][2], bez[0][3], bez[1][2], bez[1][3], 'black', 1);

let now = performance.now();
const bp = convertBezierTolottie(convertedBezierPath)
console.log('convertback', performance.now() - now, bp);
// drawPredyBezier(bp[0], bp[1], { s: 1, x: 0, y: 0, color: 'brown', ps: 4, ls: 1 });
// drawPredyBezier3d(bp[2], bp[3], { s: 1/3, x: -0.3, y: -0.3, color: 'brown', ps: 5, ls: 1 });

// let op = {
//     range: [0, 1, 0, 1],
//     segIndex: 0,
//     y: 0
// };

// let add = 0
// let lastP = []
// for (let t = 0; t < 1; t += 0.001) {
//     const tout = myGetValue(t, bp, op);
//     draw(t, tout.y, 'brown', 1);

//     draw(tout.out[0]/3-0.3, tout.out[1]/3-0.3, 'brown', 1)

//     const out = tout.out
//     if (lastP.length) {
//         add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
//     }
//     draw(t-0.2, add*0.3, 'brown', 1)

//     lastP = out
// }


