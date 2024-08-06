import { fitCurve as fitCurve2, fitCubic as fitCubic2 } from './fit-curve2.js';
import { fitCurve as myFitCurve, createTangent } from './my-fit-curve.js';
import { fitCurve as myFitCurve2, fitCubic as myFitCubic2 } from './my-fit-curve2.js';
import { getBezierValue, getValue } from './predy.js';
import { bezierCurve } from './bezierCurve.js'
import {
  calculateAngle, SEG_NUM, findClosestPoint, convertBezier, myGetBezierValue, myGetValue, vecEqual, vecLength, vecSub
} from './utils.js'
import { cutBezierCurve } from './convertCurve.js'

export function convertBezierCurveToLottie(bezierCurve, segment = SEG_NUM) {
  const num = bezierCurve[0].length / 2 - 1
  const result = [
    [], [], bezierCurve[2],
  ]

  const bis = [0]
  for (let i = 1; i < num; i++) {
    const p = bezierCurve[0].slice(2 * i, 2 * i + 2)
    const c1 = bezierCurve[1].slice(4 * i - 2, 4 * i)
    const c2 = bezierCurve[1].slice(4 * i, 4 * i + 2)

    if (Math.abs(calculateAngle(c1, c2, p) - Math.PI) > 0.02) {
      bis.push(i)
      continue
    }
  }

  bis.forEach((n, i) => {
    let slicedBezierPath = [[], [], bezierCurve[2]]
    if (bis[i + 1] === undefined) {
      slicedBezierPath = [
        bezierCurve[0].slice(n * 2),
        bezierCurve[1].slice(n * 4),
        bezierCurve[2],
      ]
    } else {
      slicedBezierPath = [
        bezierCurve[0].slice(n * 2, bis[i + 1] * 2 + 2),
        bezierCurve[1].slice(n * 4, bis[i + 1] * 4),
        bezierCurve[2],
      ]
    }
    const seg = (slicedBezierPath[0].length / 2 - 1) * segment
    const bp = cutBezierCurve(slicedBezierPath, 2, seg)

    // result
    if (n !== 0) {
      bp[0].splice(0, 2)
    }
    result[0].push(...bp[0])
    result[1].push(...bp[1])
  })

  console.log(bezierCurve, result);

  return result
}


// test

let now = performance.now();
const standardCurve = convertBezierCurveToLottie(b)
console.log('convert curve', performance.now() - now, standardCurve);

const op = {
    range: [0, 1, 0, 1],
    segIndex: 0,
    y: 0
};
drawPredyBezier(b[0], b[1], {
  color: 'brown',
  ps: 2,
  ls: 1
})
for (let t = 0; t < 1; t += 0.001) {
    const { y, t1 } = myGetBezierValue(t, b[0], b[1], op);
    draw(t, y, 'orange', 0.5);
}


drawPredyBezier(standardCurve[0], standardCurve[1], {
    color: 'blue',
    ps: 2,
    ls: 1
})
for (let t = 0; t < 1; t += 0.001) {
    const { y, t1 } = getBezierValue(t, standardCurve[0], standardCurve[1], op);
    draw(t, y, 'blue', 0.5);
}
