import {bezier as bezieres} from './ease.js';

const seg = 1000;
export const SEG_NUM = 20

class Bezier3D {

    static cache = new Map();
    
    kSplineTableSize = 11;
    
    get kSampleStepSize() {
        return 1.0 / (this.kSplineTableSize - 1.0);
    }

    P0 = [0, 0, 0];
    P1 = [0, 0, 0];
    P2 = [0, 0, 0];
    P3 = [0, 0, 0];

    step = 0.01;

    name = '';

    totalLength = 0;

    lut = [];

    constructor(P0, P1, P2, P3, segment) {
        const name = `bez_${P0.join(',')}-${P1.join(',')}-${P2.join(',')}-${P3.join(',')}-${segment}`;
        this.name = name

        this.P0 = P0;
        this.P1 = P1;
        this.P2 = P2;
        this.P3 = P3;
        this.step = 1 / segment;
        this.kSplineTableSize = Math.max(Math.ceil(Math.sqrt(segment / 10)), this.kSplineTableSize);

        if (Bezier3D.cache.has(this.name)) {
            this.totalLength = Bezier3D.cache.get(name).length;
            this.lut = Bezier3D.cache.get(name).lut;
        } else {
            this.totalLength = bezierLength(P0, P1, P2, P3, this.step);
            this.lut = new Array(this.kSplineTableSize);
            for (var i = 0; i < this.kSplineTableSize; ++i) {
                this.lut[i] = this.calcBezierPercentLength(i * this.kSampleStepSize, { length: 0, t: 0 });
            }
            Bezier3D.cache.set(name, { length: this.totalLength, lut: this.lut });
        }
        const map = []
        this.lut.forEach(item => map.push({perc: item.t, t: parseFloat((item.length / this.totalLength).toFixed(1)) }) )
        // console.log(this.lut, map);
    }

    findTByLength(percent) {
        const guess = this.lut[Math.floor(percent * (this.kSplineTableSize - 1))];
        // console.log(this.lut, percent, Math.floor(percent * (this.kSplineTableSize - 1)));
        return this.calcBezierPercentLength(percent, guess).t;
    }
    
    calcBezierPercentLength (percent, guess) {
      if (percent === 0) {
        return { t: 0, length: 0 }
      }
      if (percent === 1) {
        return { t: 1, length: this.totalLength }
      }

      const step = this.step
      const targetLength = this.totalLength * percent
      let accumulatedLength = guess.length

      for (let i = guess.t; i < 1; i += step) {
        const t0 = i
        const t1 = Math.min(i + step, 1)
        const d0 = bezierDerivative(t0, this.P0, this.P1, this.P2, this.P3)
        const d1 = bezierDerivative(t1, this.P0, this.P1, this.P2, this.P3)
        const length0 = vecLength(d0)
        const length1 = vecLength(d1)
        const segmentLength = (length0 + length1) * 0.5 * step
  
        if (accumulatedLength + segmentLength >= targetLength) {
          const ratio = (targetLength - accumulatedLength) / segmentLength
          return { t: t0 + ratio * step, length: accumulatedLength + segmentLength }
        }
        accumulatedLength += segmentLength
      }
  
      return { t: 1.0, length: this.totalLength }
    }
}

export function vecLength (v) {
    return Math.hypot(...v);
}
function clamp (v, min, max) {
    return v > max ? max : (v < min ? min : v);
}
export function vecEqual(a, b) {
  return a.every((val, i) => val === b[i])
}
export function mapRange (p, min, max) {
    return min + (max - min) * p;
}
export function mapPercent (num, min, max) {
  if (min === max) {
    return 0;
  }
  return (num - min) / (max - min);
}
function nearestStepDown(value, step) {
    let stepCount = Math.floor(value / step);
    let nearestStep = stepCount * step;
    return nearestStep;
}

// 计算曲线的长度
function bezierLength(P0, P1, P2, P3, step) {
    let totalLength = 0;
    let t0 = 0;
    const maxStep = Math.min(step * 10, 1);
    const minStep = step / 10;

    while (t0 < 1) {
        let t1 = Math.min(t0 + step, 1);
        const d0 = bezierDerivative(t0, P0, P1, P2, P3);
        const d1 = bezierDerivative(t1, P0, P1, P2, P3);
        const length0 = vecLength(d0);
        const length1 = vecLength(d1);

        const segmentLength = (length0 + length1) * 0.5 * (t1 - t0);
        const c = bezierCurvature(t0, P0, P1, P2, P3);

        if (c > 0.0001) {
            step = Math.max(minStep, step * 0.5);
        } else {
            step = Math.min(maxStep, step * 1.5);
        }

        totalLength += segmentLength;
        t0 = t1;
    }
    return totalLength;
}

// 计算三次贝塞尔曲线的导数
function bezierDerivative(t, P0, P1, P2, P3) {
    const a = -3 * (1 - t) * (1 - t);
    const b = 3 * (1 - t) * (1 - t) - 6 * t * (1 - t);
    const c = -3 * t * t + 6 * t * (1 - t);
    const d = 3 * t * t;
    const res = []
    P0.forEach((p0, i) => {
        res.push(a * P0[i] + b * P1[i] + c * P2[i] + d * P3[i]);
    })
    return res
}

// 计算三次贝塞尔曲线的二阶导数
function bezierSecondDerivative(t, P0, P1, P2, P3) {
    const a = 6 * (1 - t);
    const b = -12 * (1 - t) + 6 * t;
    const c = 6 * (1 - t) - 12 * t;
    const d = 6 * t;
    const res = []
    P0.forEach((p0, i) => {
        res.push(a * (P1[i] - P0[i]) + b * (P2[i] - P1[i]) + c * (P3[i] - P2[i]));
    })
    return res
}

function crossProduct(v1, v2) {
    if (v1.length === 2) {
        return Math.abs(v1[0] * v2[1] - v1[1] * v2[0]);
    } else {
      return vecLength([
          v1[1] * v2[2] - v1[2] * v2[1],  // X
          v1[2] * v2[0] - v1[0] * v2[2],  // Y
          v1[0] * v2[1] - v1[1] * v2[0],  // Z
      ]);
    }
}

// 计算曲率
function bezierCurvature(t, P0, P1, P2, P3) {
    const d1 = bezierDerivative(t, P0, P1, P2, P3);
    const d2 = bezierSecondDerivative(t, P0, P1, P2, P3);
    const crossProd = crossProduct(d1, d2);
    const normD1 = vecLength(d1);
    return crossProd / Math.pow(normD1, 3);
}
// 判断曲线是S型还是C型
export function classifyBezierCurve(pts, cps) {
  const p0 = [pts[0], pts[1]]
  const p1 = [cps[2], cps[3]]
  const p2 = [cps[0], cps[1]]
  const p3 = [pts[2], pts[3]]

  function side(a, b, p) {
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  }

  // 计算叉积
  const cross1 = side(p0, p3, p1);
  const cross2 = side(p0, p3, p2);

  // 判断同侧还是异侧
  if (cross1 * cross2 > 0) {
    return 1
  } else if (cross1 * cross2 < 0) {
    return 2
  } else {
    if (cross1 === 0 && cross2 === 0) {
      return 2
    } else {
      return 1
    }
  }
}


function derivative(f, x, h = 1e-5) {
  return (f(x + h) - f(x - h)) / (2 * h);
}

function secondDerivative(f, x, h = 1e-5) {
  return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

function curvature(f, x) {
  const fPrime = derivative(f, x);
  const fDoublePrime = secondDerivative(f, x);
  return Math.abs(fDoublePrime) / Math.pow(1 + fPrime * fPrime, 1.5);
}


export function myGetBezierValue (time, pts, cps, options) {
    const segCount = pts.length / 2 - 1;
    let ymin = 0;
    let ymax = 1;

    let out = {}
    const x = time;

    for (let i = 0, xIndex = 0; i < segCount; i++, xIndex += 2) {
        const t0 = pts[xIndex];
        const t1 = pts[xIndex + 2];
        const y0 = pts[xIndex + 1];
        const y1 = pts[xIndex + 3];
    
        if (x >= t0 && x < t1) {
            const mX1 = mapPercent(cps[i * 4], t0, t1);
            const mY1 = mapPercent(cps[i * 4 + 1], y0, y1);
            const mX2 = mapPercent(cps[i * 4 + 2], t0, t1);
            const mY2 = mapPercent(cps[i * 4 + 3], y0, y1);
            const bezierEasing = bezieres(mX1, mY1, mX2, mY2);
            const t = (x - t0) / (t1 - t0);
            
            let tout = bezierEasing(t);
            let y = tout.y;
            y = mapRange(y, pts[xIndex + 1], pts[xIndex + 3]);
            // console.log('g', tout, pts, cps);

            options.segIndex = i;
            options.y = y;
    
            out.y = mapRange(y, ymin, ymax);
            out.t1 = tout.t1;
            return out
        }
    }
    if (x < pts[0]) {
        options.segIndex = -1;
        options.y = pts[1];
    
        out.y = mapRange(options.y, ymin, ymax);
        out.t1 = 0;
        return out
    } else {
        options.segIndex = -2;
        options.y = pts[pts.length - 1];

        out.y = mapRange(options.y, ymin, ymax);
        out.t1 = 1;
    }
    return out
}

export function myGetValue (time, data, options) {
  const tout = myGetBezierValue(time, data[0], data[1], options);
  const y = tout.y;
  const segIndex = options.segIndex;
  const y0 = data[0][segIndex * 2 + 1] || 0;
  const y1 = data[0][segIndex * 2 + 3] || 0;
  const perc = mapPercent(y, y0, y1);
  const out = [0, 0, 0];
  const points = data[2];
  const cps = data[3];
  let t = perc;
  // console.log(y0,y1,perc,tout,time);

  if (segIndex === -1 || segIndex === -2) {
    const indexStart = segIndex === -1 ? 0 : points.length - 3;

    out[0] = points[indexStart];
    out[1] = points[indexStart + 1];
    out[2] = points[indexStart + 2];
    t = segIndex === -1 ? 0 : 1;
  } else {
    const p0Index = segIndex * 3;
    const p1Index = p0Index + 3;
    const cp0Index = segIndex * 6;
    const cp1Index = cp0Index + 3;

    const bezier3d = new Bezier3D(
        points.slice(p0Index, p0Index + 3),
        cps.slice(cp0Index, cp0Index + 3),
        cps.slice(cp1Index, cp1Index + 3),
        points.slice(p1Index, p1Index + 3),
        seg);
    t = bezier3d.findTByLength(perc)
    // console.log(t, perc);
    // t = y0 + t * (y1 - y0);


    // const t = perc;

    // const t = findTByLength(
    //     points.slice(p0Index, p0Index + 3),
    //     cps.slice(cp0Index, cp0Index + 3),
    //     cps.slice(cp1Index, cp1Index + 3),
    //     points.slice(p1Index, p1Index + 3),
    //     perc, 1000
    // )

    const ddt = 1 - t;
    const a = ddt * ddt * ddt;
    const b = 3 * t * ddt * ddt;
    const c = 3 * t * t * ddt;
    const d = t * t * t;

    for (let i = 0; i < 3; i++) {
      out[i] = a * points[p0Index + i] + b * cps[cp0Index + i] + c * cps[cp1Index + i] + d * points[p1Index + i];
    }
  }

    
  return {t1: tout.t1, t2: t, y: y, out}

//   return out;
}


export function interpolate(p1, p2, t) {
  return [
    (1 - t) * p1[0] + t * p2[0],
    (1 - t) * p1[1] + t * p2[1],
    (1 - t) * p1[2] + t * p2[2]
  ];
}
export function splitCurveAtT(points, t) {
  let [p0, p1, p2, p3] = points;

  let p01 = interpolate(p0, p1, t);
  let p12 = interpolate(p1, p2, t);
  let p23 = interpolate(p2, p3, t);

  let p012 = interpolate(p01, p12, t);
  let p123 = interpolate(p12, p23, t);

  let p0123 = interpolate(p012, p123, t);

  return [
    [p0, p01, p012, p0123],
    [p0123, p123, p23, p3]
  ];
}

export function deCasteljauSplit(pts, cps, tValues) {
  let segments = [];
  let p0 = [pts[0], pts[1], pts[2]];
  let p1 = [cps[0], cps[1], cps[2]];
  let p2 = [cps[3], cps[4], cps[5]];
  let p3 = [pts[3], pts[4], pts[5]];
  let basePoints = [p0, p1, p2, p3];

  tValues.sort((a, b) => a - b);

  let lastT = 0;
  for (let t of tValues) {
    let localT = (t - lastT) / (1 - lastT);
    let [newSegment, newBasePoints] = splitCurveAtT(basePoints, localT);
    segments.push(newSegment);
    basePoints = newBasePoints;
    lastT = t;
  }

  segments.push(basePoints);

  const points = segments.map((segment) => segment[0]).flat();
  points.push(basePoints[3][0], basePoints[3][1], basePoints[3][2]);
  const controls = segments.map((segment) => [...segment[1], ...segment[2]]).flat();

  return [points, controls];
}

export function percentSplit(pts, cps, percents) {
  const p0 = [pts[0], pts[1], pts[2]]
  const p1 = [cps[0], cps[1], cps[2]]
  const p2 = [cps[3], cps[4], cps[5]]
  const p3 = [pts[3], pts[4], pts[5]]

  const bezier3d = new Bezier3D(p0, p1, p2, p3, seg)
  const tv = percents.map(percent => bezier3d.findTByLength(percent))
  return deCasteljauSplit(pts, cps, tv)
}

export function findClosest(arr, target) {
  let closest = arr[0][0];
  let result = { i: 0, item: arr[0] };

  arr.forEach((numArr, i) => {
    if (Math.abs(numArr[0] - target) < Math.abs(closest - target)) {
      closest = numArr[0];
      result.item = numArr;
      result.i = i;
    }
  });

  return result;
}
export function convertBezier(bc) {
    const bp = [[], []]
    if (!bc.length) return bp
    bp[0].push(...bc[0][0])
    for (let i = 0; i < bc.length; i++) {
      bp[0].push(...bc[i][3])
      bp[1].push(...bc[i][1], ...bc[i][2])
    }
    return bp
}

export function findSymmetricPoint(point, center) {
  let symmetric = [];
  for (let i = 0; i < point.length; i++) {
      symmetric.push(2 * center[i] - point[i]);
  }
  return symmetric;
}

export function findMidpoint(pointA, pointB) {
  let midpoint = [];
  for (let i = 0; i < pointA.length; i++) {
    midpoint.push((pointA[i] + pointB[i]) / 2);
  }
  return midpoint;
}
  
export function calculateAngle(a, b, c) {
  const ac = a.map((val, i) => c[i] - val);
  const bc = b.map((val, i) => c[i] - val);

  const dotProduct = ac.reduce((sum, val, i) => sum + val * bc[i], 0);

  const acLength = Math.sqrt(ac.reduce((sum, val) => sum + val * val, 0));
  const bcLength = Math.sqrt(bc.reduce((sum, val) => sum + val * val, 0));

  let cosTheta = dotProduct / (acLength * bcLength);
  let angle = Math.acos(cosTheta);

  return angle;
}


export function vecSub(a, b) {
    return a.map((val, i) => val - b[i]);
}

export function findClosestPoint(p, points) {
    let min = Infinity;
    let minIndex = 0;
    points.forEach((point, i) => {
        const diff = vecLength(vecSub(p, point));
        if (diff < min) {
            min = diff;
            minIndex = i;
        }
    });
    return minIndex;
}
