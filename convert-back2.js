import { fitCurve } from './fit-curve.js';
import { fitCurve as myFitCurve } from './my-fit-curve.js';
import { getBezierValue, getValue } from './predy.js';
import { convertedBezierPath, mapRange, convertBezier, classifyBezierCurve, myGetBezierValue, myGetValue, findClosest, deCasteljauSplit } from './convert.js'
import { bezierPath } from './bezierPath.js'

function convertBezierTolottie2 (bezierPath, segment = 10000) {
    const num = bezierPath[0].length / 2 - 1;
    const result = [
    [], [],
    [], [], bezierPath[4]
    ]
    const err = 1000
    const step = 1 / segment;
    for (let n = 0; n < num; n++) {
        const slicedBezierPath = [
          bezierPath[0].slice(n * 2, n * 2 + 4),
          bezierPath[1].slice(n * 4, n * 4 + 4),
          bezierPath[2].slice(n * 3, n * 3 + 6),
          bezierPath[3].slice(n * 6, n * 6 + 6),
          bezierPath[4]
        ]
        const pStart = [slicedBezierPath[0][0], slicedBezierPath[0][1]]
        const pEnd = [slicedBezierPath[0][2], slicedBezierPath[0][3]]
        // draw(pStart[0], pStart[1], 'black', 5)
        // draw(pEnd[0], pEnd[1], 'black', 5)
  
        const fc = []

        const options = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t <= pEnd[0]; t += 0.01) {
            const {y, t1, t2} = getValue(t, slicedBezierPath, options);
            if (t2 >= 0 && t2 <= 1) fc.push([t, t2]);
            // draw(t, mapRange(t2, pStart[1], pEnd[1]), 'purple', 3);
        }
    
  
        // fit 2
        const bc = myFitCurve(fc, 0.0001)
        const bp = convertBezier(bc)

        // test
        // for (let t = 0; t < 1; t += step) {
        //     const out = getBezierValue(t, bp[0], bp[1], options);
        //     const y = out.y;
        //     draw(t, y, 'black', 1);
        // }
        // console.log('bp', bp);


        const fc2 = [];
    
        const options2 = {
            range: [0, 1, 0, 1],
            segIndex: 0,
            y: 0
        };
        for (let t = pStart[0]; t < pEnd[0]; t += step) {
            const out = getBezierValue(t, bp[0], bp[1], options2);
            const y = out.y;
            // const y = mapRange(out.y, pStart[1], pEnd[1]);
            fc2.push([t, y]);
            // draw(t, y, 'red', 1);
        }
    
        // find best
        const expectSegNum = classifyBezierCurve(slicedBezierPath[0], slicedBezierPath[1])
        let bc2 = fitCurve(fc2, 1)
        // console.log('fitCurve', n, fc2);
        bc2.forEach(b => {
            b.forEach((p, i) => {
                b[i] = [p[0], p[1]];
            }
        )})
        // if (!bc2.length) break;

        // let low = 0
        // let high = 1
        // const precision = 0.00001
        // let cycle = 0

        // while (low < high && cycle < 100) {
        //   const mid = (low + high) / 2
        //   const trialResult = fitCurve(fc2, mid)

        //   if (trialResult.length > expectSegNum) {
        //     low = mid + precision
        //   } else if (trialResult.length < expectSegNum) {
        //     high = mid - precision
        //   } else {
        //     bc2 = trialResult
        //     break
        //   }
        //   cycle++
        // }



    
        // convert 2d
        const bp2 = convertBezier(bc2)

        bp2.forEach((b, i) => {
          b.forEach((p, j) => {
            if (j % 2 === 1) {
              b[j] = mapRange(p, pStart[1], pEnd[1])
            }
          })
        })

        // bp2 test
        // for (let t = 0; t < 1; t += step) {
        //     const out = myGetBezierValue(t, bp2[0], bp2[1], options);
        //     const y = out.y;
        //     draw(t, y, 'green', 1);
        // }

        console.log('convert2d', n, bc2, bp2);
        // bc2.forEach(bez => {
        //     draw(bez[0][0], bez[0][1], 'black', 8);
        //     draw(bez[1][0], bez[1][1], 'black', 8);
        //     draw(bez[2][0], bez[2][1], 'black', 8);
        //     draw(bez[3][0], bez[3][1], 'black', 8);
        //     drawLine(bez[0][0], bez[0][1], bez[1][0], bez[1][1], 'black', 1);
        //     drawLine(bez[2][0], bez[2][1], bez[3][0], bez[3][1], 'black', 1);
        //     drawLine(bez[0][0], bez[0][1], bez[3][0], bez[3][1], 'black', 1);
        // })


    
        // convert 3d
        const tv = bp2[0].filter((_, i) => i % 2 === 0);
        for (let i = 1; i < tv.length - 1; i++) {
            tv[i] = findClosest(fc, tv[i])
        }
        tv.shift();
        tv.pop(); 
    
        const [pts, cps] = tv.length ? deCasteljauSplit(slicedBezierPath[2], slicedBezierPath[3], tv) : [slicedBezierPath[2], slicedBezierPath[3]];
        // const [pts, cps] = [slicedBezierPath[2], slicedBezierPath[3]];

        if (n !== 0) {
          bp2[0].splice(0, 2);
          pts.splice(0, 3);
        }
        result[0].push(...bp2[0]);
        result[1].push(...bp2[1]);
        result[2].push(...pts);
        result[3].push(...cps);
    }

    console.log('convert lottie 2', result);

    return result;
}

// 对照
const bp2 = convertBezierTolottie2(convertedBezierPath)
const op = {
    range: [0, 1, 0, 1],
    segIndex: 0,
    y: 0
};

for (let t = 0; t < 1; t += 0.01) {
    const tout = myGetValue(t, bp2, op);
    draw(t, tout.y, '#66CCFF', 1);

    draw(tout.out[0]/5-0.8, tout.out[1]/5, '#66CCFF', 2)
}