import { fitCurve } from './fit-curve.js';
import { fitCurve as myFitCurve, createTangent } from './my-fit-curve.js';
import { fitCurve as myFitCurve2 } from './my-fit-curve2.js';
import { getBezierValue, getValue } from './predy.js';
import { mapRange, convertBezier, classifyBezierCurve, myGetBezierValue, myGetValue, findClosest, deCasteljauSplit, mapPercent, percentSplit, vecLength, findSymmetricPoint, calculateAngle } from './convert.js'
import { bezierPath } from './bezierPath.js'
import { fineTurning } from './ml.js'

const seg = 1000;
const MAX_SEGMENT_NUM = 2
const MAX_ERROR = 0.05

function convertBezierToPredy (bezierPath, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const err = 100
    const step = 1 / segment;
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
        const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]];
        const pEnd = [slicedBezierPath[0][2], slicedBezierPath[0][3]];
        
        const fc = []
        
        const options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t < pEnd[0]; t += step) {
            let {t2, t1, y} = myGetBezierValue(t, slicedBezierPath[0], slicedBezierPath[1], options);
            fc.push([t, y]);
            draw(t+0.3, y-0.8, 'purple', 1);
            //   draw(t, mapRange(t1, pStart[1], pEnd[1]), 'purple', 1);
        }
        
        // find best
        const expectSegNum = classifyBezierCurve(slicedBezierPath[0], slicedBezierPath[1])
        let bc = myFitCurve(fc, 0.00001, expectSegNum)
    
        
        // convert 2d
        const bp = convertBezier(bc)

        // test
        bc.forEach((bez, i) => {
            draw(    bez[0][0]+0.1, bez[0][1]-0.8, 'black', 8);
            draw(    bez[1][0]+0.1, bez[1][1]-0.8, 'black', 8);
            draw(    bez[2][0]+0.1, bez[2][1]-0.8, 'black', 8);
            draw(    bez[3][0]+0.1, bez[3][1]-0.8, 'black', 8);
            drawLine(bez[0][0]+0.1, bez[0][1]-0.8, bez[1][0]+0.1, bez[1][1]-0.8, 'black', 1);
            drawLine(bez[2][0]+0.1, bez[2][1]-0.8, bez[3][0]+0.1, bez[3][1]-0.8, 'black', 1);
            // drawLine(bez[0][0]+0.1, bez[0][1]-0.8, bez[3][0]+0.1, bez[3][1]-0.8, 'black', 1);
        })
        // console.log('bp', bp, bc);
        for (let t = 0; t < 1; t += step) {
            const out = getBezierValue(t, bp[0], bp[1], options);
            draw(t+0.3, out.y-0.8, 'black', 1);
        }

    
        // convert 3d
        const tv = bp[0].filter((_, i) => i % 2 === 1);
        console.log('tv',tv);
        for (let i = 1; i < tv.length - 1; i++) {
            tv[i] = mapPercent(tv[i], bp[0][1], bp[0][bp[0].length - 1])
        }
        tv.shift();
        tv.pop();
    
        const [pts, cps] = tv.length ? percentSplit(slicedBezierPath[2], slicedBezierPath[3], tv) : [slicedBezierPath[2], slicedBezierPath[3]];
        const bp3 = convertBezierToPredy3d2([bp[0], bp[1], pts, cps, bezierPath[4]], tv)

        // result
        if (n !== 0) {
            bp[0].splice(0, 2);
            bp3[0].splice(0, 3);
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);
        result[2].push(...bp3[0]);
        result[3].push(...bp3[1]);
    }
    console.log('result cv2', result[0].length/2-1, result);
  
    return result;
}


function convertBezierToPredy3d(bezierPath, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const step = 1 / segment;
    const result = [[], []]

    let add = 0;
    let add2 = 0;

    let lastP = [];
    let lastP2 = [];
    for (let n = 0; n < num; n++) {
        const slicedBezierPath = [
            bezierPath[0].slice(n * 2, n * 2 + 4),
            bezierPath[1].slice(n * 4, n * 4 + 4),
            bezierPath[2].slice(n * 3, n * 3 + 6),
            bezierPath[3].slice(n * 6, n * 6 + 6),
            bezierPath[4]
        ]
        const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]];
        const pEnd = [slicedBezierPath[0][2], slicedBezierPath[0][3]];
        
        const fc = []
        let options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t < pEnd[0]; t += step) {
            let {t2, t1, y, out} = myGetValue(t, slicedBezierPath, options);
            fc.push(out);

            // draw(t, y, 'purple', 1);
            draw(out[0]/5-0.5, out[1]/5, 'red', 2);
            if (lastP.length) {
                add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
            }
            console.log('t',t, vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]]), out);
            draw(t+0.15, add * 0.08 + 0.2, 'red', 1);
            lastP = out;
        }

        console.log('start1', fc, pStart[0], pEnd[0]);
        const bc = myFitCurve(fc, 0.0000001, 1)
        console.log('end',bc);

        // test bc
        // bc.forEach(bez => {
        //     bez.forEach((p, i) => {
        //         draw(p[0]/5-0.4, p[1]/5, 'black', 5);
        //     })
        // })
        

        // convert 3d
        const bp = convertBezier(bc)

        // test bp
        options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t < pEnd[0]; t += 0.001) {
            const tout = getValue(t, [slicedBezierPath[0], slicedBezierPath[1], bp[0], bp[1]], options);
            const out = tout.out
            if (lastP2.length) {
                add2 += vecLength([out[0] - lastP2[0], out[1] - lastP2[1], out[2] - lastP2[2]])
            }
            draw(t+0.05, add2 * 0.08 + 0.2, 'purple', 1);
            lastP2 = out;
        }
        
        // result
        if (n !== 0) {
            bp[0].splice(0, 3);
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);
    }
    return result
}















function convertBezierToPredy2 (bezierPath, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const step = 1 / segment;
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
        const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]];
        const pEnd = [slicedBezierPath[0][2], slicedBezierPath[0][3]];
        
        const fc = []
        const u = []
        
        let options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t <= pEnd[0]; t += step) {
            t = parseFloat(t.toFixed(6))
            let {t2, t1, y} = myGetBezierValue(t, slicedBezierPath[0], slicedBezierPath[1], options);
            fc.push([t, y]);
            u.push(t1);
            draw(t+0.1, y-0.8, 'purple', 1);
            // draw(t, t1, 'purple', 1);
            // let o2 = getBezierValue(t1, slicedBezierPath[0], slicedBezierPath[1], options);
            // draw(t+0.1, o2.y-0.8, 'blue', 1);
        }
        
        // find best
        // const expectSegNum = classifyBezierCurve(slicedBezierPath[0], slicedBezierPath[1])
        // const maxCurvature = findMaxCurvature(slicedBezierPath[0], slicedBezierPath[1])
        // const expectSegNum = maxCurvature > 1.5 ? 2 : 1;
        // console.log('ex', expectSegNum, maxCurvature);

        // let bc = myFitCurve2(fc, 0.0000001, expectSegNum)
        // console.log('fit', bc);

        // bc.forEach((b, i) => {
        //    bc[i] = fineTurning(fc, b, 0.0001)
        // }) 
        // console.log('fine', bc);
    
        
        // convert 2d
        // const bp = convertBezier(bc)
        // console.log(bp);

        let seg_num = 1
        let bc
        let cycle = 0
        do {
          bc = myFitCurve(fc, 0.0000001, seg_num++)
          const bp2 = convertBezier(bc)
          const op = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0,
          }
          let max = 0
          fc.forEach(p => {
            const { y } = getBezierValue(p[0], bp2[0], bp2[1], op)
            const diff = Math.abs(p[1] - y)
            if (diff > max) max = diff
          })
          console.log('max', max, max / Math.abs(pEnd[1] - pStart[1]), cycle);
          if (max / Math.abs(pEnd[1] - pStart[1]) < MAX_ERROR) break
          cycle++
        } while (bc.length < MAX_SEGMENT_NUM && cycle < 10)

        const bp = convertBezier(bc)

        // test
        bc.forEach((bez, i) => {
            drawBezier(bez[0], bez[1], bez[2], bez[3], { x: 0.1, y: -0.8, color: 'black', ps: 4, ls: 1 });
        })
        for (let t = 0; t < 1; t += step) {
            const out = getBezierValue(t, bp[0], bp[1], options);
            draw(t+0.1, out.y-0.8, 'black', 1);
        }

    
        // convert 3d
        const tv = bp[0].filter((_, i) => i % 2 === 1);
        // console.log('tv',tv);
        for (let i = 1; i < tv.length - 1; i++) {
            tv[i] = mapPercent(tv[i], bp[0][1], bp[0][bp[0].length - 1])
        }
        tv.shift();
        tv.pop();
    
        const [pts, cps] = tv.length ? percentSplit(slicedBezierPath[2], slicedBezierPath[3], tv) : [slicedBezierPath[2], slicedBezierPath[3]];
        const bp3 = convertBezierToPredy3d2([bp[0], bp[1], pts, cps, bezierPath[4]], tv)

        // result
        if (n !== 0) {
            bp[0].splice(0, 2);
            bp3[0].splice(0, 3);
            // pts.splice(0, 3);
        }
        result[0].push(...bp[0]);
        result[1].push(...bp[1]);
        result[2].push(...bp3[0]);
        result[3].push(...bp3[1]);
        // result[2].push(...pts);
        // result[3].push(...cps);
    }
    console.log('result cv2', result[0].length/2-1, result);

    return result;
}

  
function convertBezierToPredy3d2(bezierPath, tv, segment = seg) {
    const num = bezierPath[0].length / 2 - 1;
    const step = 1 / segment;
    const result = [[], []]

    let lastP = [];
    let add = 0;
    const fc = []
    const t2s = []
    const ty = []
    for (let n = 0; n < num; n++) {
        const slicedBezierPath = [
            bezierPath[0].slice(n * 2, n * 2 + 4),
            bezierPath[1].slice(n * 4, n * 4 + 4),
            bezierPath[2].slice(n * 3, n * 3 + 6),
            bezierPath[3].slice(n * 6, n * 6 + 6),
            bezierPath[4]
        ]
        const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]];
        const pEnd = [slicedBezierPath[0][2], slicedBezierPath[0][3]];
        
        let options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t < pEnd[0]; t += step) {
            let {t2, t1, y, out} = myGetValue(t, slicedBezierPath, options);
            t = parseFloat(t.toFixed(6))
            fc.push(out);
            t2s.push(t2);
            ty.push([y, t]);
            // draw(t, y, 'purple', 1)
            draw(out[0]/5-0.5, out[1]/5, 'red', 2);
            if (lastP.length) {
                add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
            }
            // console.log('t',t, vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]]));
            // draw(t, add * 0.2, 'red', 1);
            lastP = out;
        }
        // console.log('stp');
        if (n === num - 1) {
            const { out, t2, y } = myGetValue(pEnd[0], slicedBezierPath, options)
            fc.push(out)
            t2s.push(t2);
            ty.push([y, pEnd[0]]);
        }
    }

    // indices.shift(0)
    // const bc = fitCurve(fc, 1)
    // const bc = myFitCurve2(fc, 0.00001, 1, t2s)
    // const bp = convertBezier(bc)

    // const [pts, cps] = tv.length ? percentSplit(bp[0], bp[1], tv) : [bp[0], bp[1]];


    let bc = []
    let lastIndex = 0
    tv.push(1)
    tv.forEach((t, i) => {
        const index = findClosest(ty, t).i
        let tmp = myFitCurve2(fc.slice(lastIndex, index), 0.0000001, 1, t2s.slice(lastIndex, index))
        bc.push(...tmp)
        lastIndex = index
    })

    const bp = convertBezier(bc)
    const [pts, cps] = [bp[0], bp[1]];
    console.log('ps', pts, cps);

    // test bp
    drawPredyBezier3d(pts, cps, { s: 0.2, x: -0.4, y: 0, color: 'black', ps: 5, ls: 1 });
    // for (let n = 0; n < pts.length / 3 - 1; n++) {
    //     const p0 = pts.slice(n * 3, n * 3 + 3);
    //     const p1 = cps.slice(n * 6, n * 6 + 3);
    //     const p2 = cps.slice(n * 6 + 3, n * 6 + 6);
    //     const p3 = pts.slice(n * 3 + 3, n * 3 + 6);
    //     if (n) {
    //         const a = calculateAngle(p1, cps.slice(n * 6 - 3, n * 6), p0)
    //         console.log('angle', a-Math.PI);
    //     }
    // }



    // result
    result[0].push(...pts);
    result[1].push(...cps);
    return result
}



// test
// const bp = convertBezierToPredy2(bezierPath)
// export const convertedBezierPath = bp;

// const op = {
//     range: [0, 1, 0, 1],
//     segIndex: 0,
//     y: 0
// };

// let add = 0
// let lastP = [];
// for (let t = 0; t < 1; t += 0.001) {
//     // const tout = getBezierValue(t, [...bc[0][0], ...bc[0][3]], [...bc[0][1], ...bc[0][2]], options);
//     // const tout = getValue(t, bp, op);


//     const tout = getValue(t, bezierPath, op);
//     // draw(t, tout.y, 'red', 1);
//     // draw(tout.out[0]/5-0.5, tout.out[1]/5, 'red', 2);


//     const tout2 = getValue(t, bp, op);
//     // draw(t+0.1, tout2.y, 'green', 1);
//     // draw(tout2.out[0]/5-0.4, tout2.out[1]/5, 'blue', 2);

//     const out = tout2.out
//     if (lastP.length) {
//         add += vecLength([out[0] - lastP[0], out[1] - lastP[1], out[2] - lastP[2]])
//     }
//     // draw(t, add*0.3333, 'blue', 1);
//     lastP = out;
// }
