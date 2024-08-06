
import { bezierPath } from './bezierPath.js'


let count = 0;
function clamp (v, min, max) {
    return v > max ? max : (v < min ? min : v);
}
function mapRange (p, min, max) {
    return min + (max - min) * p;
}
function mapPercent (num, min, max) {
    if (min === max) {
        return 0;
    }
    return (num - min) / (max - min);
}


export function getBezierValue (time, pts, cps, options) {
    const segCount = pts.length / 2 - 1;
    let ymin = 0;
    let ymax = 1;
  
    let out = {}

    const x = time
  
    for (let i = 0, xIndex = 0; i < segCount; i++, xIndex += 2) {
        const t0 = pts[xIndex];
        const t1 = pts[xIndex + 2];
    
        if (x >= t0 && x < t1) {
            const t = (x - t0) / (t1 - t0);//this is wrong,but faster
            const u = 1 - t;
            const cpIndex = i * 4;
            const a = u * u * u;
            const b = 3 * t * u * u;
            const c = 3 * t * t * u;
            const d = t * t * t;
            const y = a * pts[xIndex + 1] + b * cps[cpIndex + 1] + c * cps[cpIndex + 3] + d * pts[xIndex + 3];
    
            options.segIndex = i;
            options.y = y;

            out.y = mapRange(y, ymin, ymax);
            out.t1 = t;
            return out
        }
    }
    if (x < pts[0]) {
        options.segIndex = -1;
        options.y = pts[1];
    
        out.y = mapRange(options.y, ymin, ymax);
        return out
    }
    options.segIndex = -2;
    options.y = pts[pts.length - 1];
  
    out.y = mapRange(options.y, ymin, ymax);
    return out
}
  

export function getValue (time, data, options) {
    const tout = getBezierValue(time, data[0], data[1], options);
    const y = tout.y;
    const segIndex = options.segIndex;
    const y0 = data[0][segIndex * 2 + 1] || 0;
    const y1 = data[0][segIndex * 2 + 3] || 0;
    const t = mapPercent(y, y0, y1);
    const points = data[2];
    const cps = data[3];
    const out = [0, 0, 0];

    if (segIndex === -1 || segIndex === -2) {
      const indexStart = segIndex === -1 ? 0 : points.length - 3;

      out[0] = points[indexStart];
      out[1] = points[indexStart + 1];
      out[2] = points[indexStart + 2];
    } else {
      const p0Index = segIndex * 3;
      const p1Index = p0Index + 3;
      const cp0Index = segIndex * 6;
      const cp1Index = cp0Index + 3;
      const ddt = 1 - t;
      const a = ddt * ddt * ddt;
      const b = 3 * t * ddt * ddt;
      const c = 3 * t * t * ddt;
      const d = t * t * t;

      for (let i = 0; i < 3; i++) {
        out[i] = a * points[p0Index + i] + b * cps[cp0Index + i] + c * cps[cp1Index + i] + d * points[p1Index + i];
      }
    }

    // return out;
    return {y: tout.y, t1: tout.t1, t2: t, out}
}

const pxCoords = [];
const pyCoords = [];
const lastP = [0, 0];

for (let i = 0; i < 1; i += 0.001) {
    const options = {
        range: [0, 1, 0, 1],
        segIndex: 0,
        y: 0
    };
    const out = getValue(i, bezierPath, options);
    pxCoords.push(out.out[0]);
    pyCoords.push(out.out[1]);
    // console.log(Math.sqrt((out[0] - lastP[0]) * (out[0] - lastP[0]) + (out[1] - lastP[1]) * (out[1] - lastP[1])));
    // lastP[0] = out[0];
    // lastP[1] = out[1];
    // draw(out.out[0]/5-0.6, out.out[1]/5, 'pink', 2)
    // draw(i, out.y, 'pink', 1)
    // draw(i, out.y, 'blue', 1)
}
// console.log(pxCoords, pyCoords);

for (let i = 0; i < pxCoords.length; i++) {
    // draw(Math.abs(pxCoords[i]/5), -Math.abs(pyCoords[i]/5), 'pink', 3)
}