import { bezier as BezierEasing} from "./ease.js";
import { vecSub, vecLength, mapRange, mapPercent } from "./utils.js";


const Tools = {
  /**
   * euclidean modulo
   * @method
   * @param {Number} n input value
   * @param {Number} m modulo
   * @return {Number} re-map to modulo area
   */
  euclideanModulo: function (n, m) {
    return ((n % m) + m) % m;
  },

  /**
   * bounce value when value spill codomain
   * @method
   * @param {Number} n input value
   * @param {Number} min lower boundary
   * @param {Number} max upper boundary
   * @return {Number} bounce back to boundary area
   */
  codomainBounce: function (n, min, max) {
    if (n < min) return 2 * min - n;
    if (n > max) return 2 * max - n;
    return n;
  },

  /**
   * clamp a value in range
   * @method
   * @param {Number} x input value
   * @param {Number} a lower boundary
   * @param {Number} b upper boundary
   * @return {Number} clamp in range
   */
  clamp: function (x, a, b) {
    return x < a ? a : x > b ? b : x;
  },
};

const EX_REG = /(loopIn|loopOut)\(([^)]+)/;
const STR_REG = /["']\w+["']/;

/**
 * Cycle
 * @class
 * @private
 */
class Cycle {
  begin;
  end;
  total;
  type;
  /**
   * Pingpong
   * @param {*} type Pingpong
   * @param {*} begin Pingpong
   * @param {*} end Pingpong
   */
  constructor(type, begin, end) {
    this.begin = begin;
    this.end = end;
    this.total = this.end - this.begin;
    this.type = type;
  }

  /**
   * progress
   * @param {number} progress progress
   * @return {number} progress
   */
  update(progress) {
    if (this.type === "in") {
      if (progress >= this.begin) return progress;
      return this.end - Tools.euclideanModulo(this.begin - progress, this.total);
    } else if (this.type === "out") {
      if (progress <= this.end) return progress;
      return this.begin + Tools.euclideanModulo(progress - this.end, this.total);
    }
  }
}

/**
 * Pingpong
 * @class
 * @private
 */
class Pingpong {
  begin;
  end;
  total;
  type;
  /**
   * Pingpong
   * @param {*} type Pingpong
   * @param {*} begin Pingpong
   * @param {*} end Pingpong
   */
  constructor(type, begin, end) {
    this.begin = begin;
    this.end = end;
    this.total = this.end - this.begin;
    this.type = type;
  }

  /**
   * progress
   * @param {number} progress progress
   * @return {number} progress
   */
  update(progress) {
    if (
      (this.type === "in" && progress < this.begin) ||
      (this.type === "out" && progress > this.end)
    ) {
      const space = progress - this.end;
      return this.pingpong(space);
    }
    return progress;
  }

  /**
   * pingpong
   * @param {number} space
   * @return {number}
   */
  pingpong(space) {
    const dir = Math.floor(space / this.total) % 2;
    if (dir) {
      return this.begin + Tools.euclideanModulo(space, this.total);
    } else {
      return this.end - Tools.euclideanModulo(space, this.total);
    }
  }
}

const FN_MAPS = {
  loopIn(datak, mode, offset) {
    const begin = datak[0].t;
    const last = datak.length - 1;
    const endIdx = Math.min(last, offset);
    const end = datak[endIdx].t;
    switch (mode) {
      case "cycle":
        return new Cycle("in", begin, end);
      case "pingpong":
        return new Pingpong("in", begin, end);
      default:
        break;
    }
    return null;
  },
  loopOut(datak, mode, offset) {
    const last = datak.length - 1;
    const beginIdx = Math.max(0, last - offset);
    const begin = datak[beginIdx].t;
    const end = datak[last].t;
    switch (mode) {
      case "cycle":
        return new Cycle("out", begin, end);
      case "pingpong":
        return new Pingpong("out", begin, end);
      default:
        break;
    }
    return null;
  },
};

/**
 * parseParams
 * @ignore
 * @param {string} pStr string
 * @return {array}
 */
function parseParams(pStr) {
  const params = pStr.split(/\s*,\s*/);
  return params.map((it) => {
    if (STR_REG.test(it)) return it.replace(/"|'/g, "");
    return parseInt(it);
  });
}

/**
 * parseEx
 * @ignore
 * @param {string} ex string
 * @return {object}
 */
function parseEx(ex) {
  const rs = ex.match(EX_REG);
  const ps = parseParams(rs[2]);
  return {
    name: rs[1],
    mode: ps[0],
    offset: ps[1],
  };
}

/**
 * hasSupportExpression
 * @ignore
 * @param {string} ksp string
 * @return {boolean}
 */
function hasSupportExpression(ksp) {
  return ksp.x && EX_REG.test(ksp.x);
}

/**
 * getExpression
 * @ignore
 * @param {object} ksp ksp
 * @return {object}
 */
function getExpression(ksp) {
  const { name, mode, offset = 0 } = parseEx(ksp.x);
  const _offset = offset === 0 ? ksp.k.length - 1 : offset;
  return FN_MAPS[name] && FN_MAPS[name](ksp.k, mode, _offset);
}

const defaultCurveSegments = 200;
const beziers = {};

/**
 * get a bezierEasing from real time or cache
 */
function getBezierEasing(
  a,
  b,
  c,
  d,
  nm
) {
  const str = nm || ("bez_" + a + "_" + b + "_" + c + "_" + d).replace(/\./g, "p");
  let bezier = beziers[str];

  if (bezier) {
    return bezier;
  }

  bezier = BezierEasing(a, b, c, d);
  beziers[str] = bezier;

  return bezier;
}

const storedData = {};

function buildBezierData(s, e, to, ti, segments) {
  const curveSegments = segments
    ? Math.min(segments, defaultCurveSegments)
    : defaultCurveSegments;
  const bezierName = (
    s[0] +
    "_" +
    s[1] +
    "_" +
    e[0] +
    "_" +
    e[1] +
    "_" +
    to[0] +
    "_" +
    to[1] +
    "_" +
    ti[0] +
    "_" +
    ti[1] +
    "_" +
    curveSegments
  ).replace(/\./g, "p");

  if (!storedData[bezierName]) {
    let segmentLength = 0;
    let lastPoint= [];
    let points = [];

    for (let k = 0; k < curveSegments; k++) {
      const len = to.length;
      const point = new Array(len);
      const perc = k / (curveSegments - 1);
      let ptDistance = 0;

      for (let i = 0; i < len; i += 1) {
        const ptCoord =
          Math.pow(1 - perc, 3) * s[i] +
          3 * Math.pow(1 - perc, 2) * perc * (s[i] + to[i]) +
          3 * (1 - perc) * Math.pow(perc, 2) * (e[i] + ti[i]) +
          Math.pow(perc, 3) * e[i];

        point[i] = ptCoord;

        if (lastPoint.length) {
          ptDistance += Math.pow(point[i] - lastPoint[i], 2);
        }
      }

      ptDistance = Math.sqrt(ptDistance);
      segmentLength += ptDistance;

      points.push({
        partialLength: ptDistance,
        point,
      });

      lastPoint = point;
    }

    storedData[bezierName] = {
      segmentLength,
      points,
    };
  }

  return storedData[bezierName];
}

/**
 * basic property for animate property unit
 * @internal
 */
class BaseProperty {
  mult;
  v;

  value;
  newValue;
  expression;
  animated;

  constructor(
    data,
    mult
  ) {
    this.mult = mult || 1;
    this.value = data.k;
    this.animated = data.a;

    if (hasSupportExpression(data)) {
      this.expression = getExpression(data);
    }
  }

  getValue(frameNum, i, keyData, nextKeyData) {
    let perc;
    const keyTime = keyData.t;
    const nextKeyTime = nextKeyData.t;
    const startValue = keyData.s[i];
    const endValue = (nextKeyData.s || keyData.e)[i];

    if (keyData.h === 1) {
      return startValue;
    }

    if (frameNum >= nextKeyTime) {
      perc = 1;
    } else if (frameNum < keyTime) {
      perc = 0;
    } else {
      if (!keyData.beziers) {
        keyData.beziers = [];
      }
      let bezier = keyData.beziers[i];

      if (!bezier) {
        if (typeof keyData.o?.x === "number" && typeof keyData.i?.y === "number") {
          bezier = getBezierEasing(keyData.o.x, keyData.o.y, keyData.i.x, keyData.i.y);
        } else {
          bezier = getBezierEasing(
            keyData.o.x[i],
            keyData.o.y[i],
            keyData.i.x[i],
            keyData.i.y[i]
          );
        }
        keyData.beziers[i] = bezier;
      }

      const res = bezier((frameNum - keyTime) / (nextKeyTime - keyTime));

      if ('y' in res) {
        perc = res.y
      } else {
        perc = res
      }
    }

    return startValue + (endValue - startValue) * perc;
  }

    reset() {}
}

/**
 * keyframed multidimensional value property
 */
class KeyframedMultidimensionalProperty extends BaseProperty {
  _lastPoint = 0;
  _addedLength = 0;
  _frames;

  constructor(data, mult = 1, frames) {
    super(data, mult);

    let arrLen = this.value[0].s.length;

    // Set bezier segments according to frames, which is better for performance.
    if (frames) {
      this._frames = frames >> 0;
    }

    this.newValue = new Float32Array(arrLen);
    this.v = new Float32Array(arrLen);
  }

  update(frameNum) {
    if (this.expression) {
      frameNum = this.expression.update(frameNum);
    }

    const { value } = this;
    let { newValue } = this;

    let keyData = value[0];
    let nextKeyData = value[1];

    // Find current frame
    for (let i = 0, l = value.length - 1; i < l; i++) {
      keyData = value[i];
      nextKeyData = value[i + 1];

      if (nextKeyData.t > frameNum) {
        this._lastPoint = 0;
        this._addedLength = 0;
        break;
      }
    }

    if (frameNum > nextKeyData.t) {
      for (let i = 0, len = this.v.length; i < len; i++) {
        this.v[i] = this.getValue(frameNum, i, keyData, nextKeyData) * this.mult;
      }
      return;
    }

    if (keyData.to) {
      let nextKeyTime = nextKeyData.t;
      let keyTime = keyData.t;

      if (!keyData.bezierData) {
        keyData.bezierData = buildBezierData(
          keyData.s,
          nextKeyData.s || keyData.e,
          keyData.to,
          keyData.ti,
          this._frames
        );
      }

      const { points, segmentLength } = keyData.bezierData;

      let bezier = keyData.timeBezier;

      // Cache time bezier easing
      if (!bezier) {
        bezier = getBezierEasing(keyData.o.x, keyData.o.y, keyData.i.x, keyData.i.y, keyData.n);
        keyData.timeBezier = bezier;
      }

      let t = 0;

      if (nextKeyTime >= 0) {
        t = (frameNum - keyTime) / (nextKeyTime - keyTime);
        t = Math.min(Math.max(0, t), 1);
      }

      // const percent = bezier(t);
      let percent;
      const res = bezier(t);
      if ('y' in res) {
        percent = res.y
      } else {
        percent = res
      }

      let distanceInLine = segmentLength * percent;

      let addedLength = this._addedLength;
      let lastPoint = this._lastPoint;

      for (let i = lastPoint, l = points.length; i < l; i++) {
        if (i === l - 1) {
          lastPoint = 0;
          addedLength = 0;

          break;
        }

        lastPoint = i;

        const point = points[i];
        const nextPoint = points[i + 1];
        const { partialLength } = nextPoint;

        if (distanceInLine >= addedLength && distanceInLine < addedLength + partialLength) {
          const segmentPercent = (distanceInLine - addedLength) / partialLength;

          for (let k = 0, l = point.point.length; k < l; k += 1) {
            newValue[k] = point.point[k] + (nextPoint.point[k] - point.point[k]) * segmentPercent;
          }

          break;
        }

        // Add partial length util the distanceInLine is between two points.
        addedLength += partialLength;
      }

      this._lastPoint = lastPoint;
      this._addedLength = addedLength;
    } else {
      if (!keyData.beziers) {
        keyData.beziers = [];
      }

      for (let i = 0, len = keyData.s.length; i < len; i++) {
        newValue[i] = this.getValue(frameNum, i, keyData, nextKeyData);
      }
    }

    for (let i = 0, len = this.v.length; i < len; i++) {
      this.v[i] = newValue[i] * this.mult;
    }
  }
}

class KeyframedValueProperty extends BaseProperty {
  _value = 0;

  constructor(data, mult = 1) {
    super(data, mult);
    this.v = 0;

    if (hasSupportExpression(data)) {
      this.expression = getExpression(data);
    }
  }

  reset() {
    this._value = 0;
  }

  update(frameNum) {
    if (this.expression) {
      frameNum = this.expression.update(frameNum);
    }

    const { value } = this;

    let keyData = value[0];
    let nextKeyData = value[1];

    // Find current frame
    for (let i = 0, l = value.length - 1; i < l; i++) {
      keyData = value[i];
      nextKeyData = value[i + 1];
      if (nextKeyData.t > frameNum) {
        break;
      }
    }

    if (!keyData.beziers) {
      keyData.beziers = [];
    }

    this.v = this.getValue(frameNum, 0, keyData, nextKeyData) * this.mult;
  }
}


// path

// export function expectBezierPathCloseToLottie(
//   bezier: BezierPath3D,
//   kfs[],
//   message = ""
// ) {
//   const a = new KeyframedMultidimensionalProperty({ k: kfs, a: true });

//   const fstart = kfs[0].t
//   const fend = kfs[kfs.length - 1].t;

//   let lastP0[] = [];
//   let lastP1[] = [];
//   let l0 = 0;
//   let l1 = 0;
//   const options = {
//     range: [0, 1, 0, 1],
//     segIndex: 0,
//     y: 0,
//   }
//   for (let i = fstart; i <= fend; i++) {
//     a.update(i);
//     const t = (i - fstart) / (fend - fstart)
//     const { out } = predyGetValue(t, bezier, options)
//     if (i === 0) {
//       lastP0 = [...a.v];
//       lastP1 = out;
//       continue;
//     }

//     l0 += vecLength(vecSub([...a.v], lastP0));
//     l1 += vecLength(vecSub(out, lastP1));
//     lastP0 = [...a.v];
//     lastP1 = out;
//   }

//   expect((l0 - l1) / l1).to.lessThanOrEqual(0.01, `${message} path length`);

//   for (let i = fstart; i < fend; i++) {
//     a.update(i);
//     const t = (i - fstart) / (fend - fstart)
//     const { out } = predyGetValue(t, bezier, options)
//     expect(vecLength(vecSub([...a.v], out)) / l0).to.lessThanOrEqual(Math.max(1 / (fend - fstart), 0.05), `${message} frame[${i}] / ${fend}`);
//   }
// }

function ensureVec(num) {
    return Number.isFinite(num) ? [num] : num
}

function drawLottieCurve(
  kfs, color
) {
  const a = new KeyframedValueProperty({ k: kfs, a: true });

  const fstart = kfs[0].t
  const fend = kfs[kfs.length - 1].t;

  const ymins = ensureVec(kfs[0].s).slice()
  const ymaxs = ensureVec(kfs[kfs.length - 1].s).slice()
  const dimension = ensureVec(kfs[0].s).length

  for (let i = 0; i < kfs.length - 1; i++) {
    const keyframe = kfs[i]
    const y0 = ensureVec(keyframe.s)
    const y1 = ensureVec(keyframe.e || kfs[i + 1].s) || y0
    const iny = ensureVec(keyframe.i.y)
    const oy = ensureVec(keyframe.o.y)
    for (let j = 0; j < dimension; j++) {
      const d = y1[j] - y0[j]
      const inyN = (d === 0 ? iny[j] : (iny[j] * d)) + y0[j]
      const oyN = (d === 0 ? oy[j] : (oy[j] * d)) + y0[j]
      ymins[j] = Math.min(y0[j], inyN, oyN, ymins[j], y1[j])
      ymaxs[j] = Math.max(y0[j], inyN, oyN, ymaxs[j], y1[j])
    }
  }

  for (let i = fstart; i <= fend; i++) {
    a.update(i);
    // console.log('test curve', i, a.v, ymins, ymins);
    const t = (i - fstart) / (fend - fstart)
    draw(t, mapPercent(a.v, ymins[0], ymaxs[0]), color, 1)
  }
}

let lt = [
    {
        "i": {
            "x": [
                0.693,
                0.693,
                0.833
            ],
            "y": [
                0.956,
                0.963,
                1.1
            ]
        },
        "o": {
            "x": [
                0.166,
                0.166,
                0.167
            ],
            "y": [
                -0.504,
                -0.429,
                -0.083
            ]
        },
        "t": 0,
        "s": [
            183.017,
            100,
            100
        ],
        "beziers": [
            null
        ]
    },
    {
        "i": {
            "x": [
                0.347,
                0.347,
                0.592
            ],
            "y": [
                1.28,
                1.248,
                1.175
            ]
        },
        "o": {
            "x": [
                0.408,
                0.408,
                0.164
            ],
            "y": [
                -0.036,
                -0.031,
                -0.06
            ]
        },
        "t": 18,
        "s": [
            268,
            200,
            100
        ],
        "beziers": [
            null
        ]
    },
    {
        "i": {
            "x": [
                0.826,
                0.826,
                0.83
            ],
            "y": [
                0.713,
                -0.543,
                1.118
            ]
        },
        "o": {
            "x": [
                0.538,
                0.538,
                0.424
            ],
            "y": [
                -0.318,
                -1.708,
                -0.298
            ]
        },
        "t": 29,
        "s": [
            183.017,
            104.014,
            100
        ]
    },
    {
        "t": 47.0000019143492,
        "s": [
            83.373,
            85.452,
            100
        ]
    }
]

let lt2 = [
    {
        "t": 0,
        "s": [
            183.017,
            100,
            100
        ],
        "i": {
            "x": [
                0.9284380456871208,
                0.9283370986149567,
                4.178887665961461
            ],
            "y": [
                1.268928017944062,
                1.9746301857284794,
                0
            ]
        },
        "o": {
            "x": [
                1.2353169256682037,
                1.2354178727403684,
                0.82111233403854
            ],
            "y": [
                5.526568112778539,
                14.436695506699653,
                0
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 3.5999999999999996,
        "s": [
            179.00976238750678,
            98.62581681449129,
            100
        ],
        "i": {
            "x": [
                0.48207465331119825,
                0.3847763548768273,
                1.4766806747174723
            ],
            "y": [
                0.7866952315435125,
                0.7568180398427621,
                0
            ]
        },
        "o": {
            "x": [
                0.42409529965745885,
                0.42400128322170993,
                1.0537001751683772
            ],
            "y": [
                0.2870648630335331,
                0.3126726506075494,
                0
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 18,
        "s": [
            268,
            200,
            100
        ],
        "i": {
            "x": [
                0.5492887283517898,
                0.546995477870728,
                4.206584323553266
            ],
            "y": [
                0.6823319109115927,
                0.6743744196666488,
                0
            ]
        },
        "o": {
            "x": [
                0.9764877940614589,
                1.2590273372943113,
                2.724528775434249
            ],
            "y": [
                0.13326693536099485,
                0.17762557372724305,
                0
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 24.599999999999994,
        "s": [
            188.82594175348368,
            111.82713641731443,
            100
        ],
        "i": {
            "x": [
                0.7517506093068932,
                0.6159683629211784
            ],
            "y": [
                1.750894194708691,
                1
            ]
        },
        "o": {
            "x": [
                0.14993335497938032,
                0.11810531587330142
            ],
            "y": [
                0.9602140486791662,
                0.6387099798839738
            ]
        }
    },
    {
        "t": 29,
        "s": [
            183.017,
            104.01399999999998
        ],
        "i": {
            "x": [
                0.8057898586373862,
                1.0320825218745355
            ],
            "y": [
                -0.09625161093401768,
                1.8088572184196514
            ]
        },
        "o": {
            "x": [
                0.2922698643111836,
                0.34732053628495524
            ],
            "y": [
                -0.7020442736248438,
                0.8667969107135637
            ]
        }
    },
    {
        "t": 38.000000957174606,
        "s": [
            173.69385672842725,
            114.89512043378969
        ],
        "i": {
            "x": [
                0.6969985137279909,
                0.8487865145170975
            ],
            "y": [
                0.6621136558515633,
                0.6442842182184602
            ]
        },
        "o": {
            "x": [
                0.5084612809265062,
                0.7070693518488677
            ],
            "y": [
                0.2962583073679897,
                0.24948687311286105
            ]
        }
    },
    {
        "t": 47.0000019143492,
        "s": [
            83.373,
            85.452
        ]
    }
]

lt = [
    {
        "t": 0,
        "s": [
            100
        ],
        "i": {
            "x": [
                0.5755094809677697
            ],
            "y": [
                0.9480025037713203
            ]
        },
        "o": {
            "x": [
                0.13558167401837767
            ],
            "y": [
                1.1310342274598613
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 14,
        "s": [
            0
        ],
        "i": {
            "x": [
                0.3703697473168668
            ],
            "y": [
                0.4646351076657478
            ]
        },
        "o": {
            "x": [
                0.5385542194558578
            ],
            "y": [
                0.011583567425252649
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 39,
        "s": [
            100
        ],
        "i": {
            "x": [
                0.5955883147199321
            ],
            "y": [
                0.9973245366034769
            ]
        },
        "o": {
            "x": [
                0.36991256303087905
            ],
            "y": [
                0.14889937852834664
            ]
        },
        "beziers": [
            null
        ]
    },
    {
        "t": 59.0000024031193,
        "s": [
            0
        ]
    }
]

lt2 = [
    {
        "i": {
            "x": [
                0.374
            ],
            "y": [
                0.997
            ]
        },
        "o": {
            "x": [
                0.034
            ],
            "y": [
                0.538
            ]
        },
        "t": 0,
        "s": [
            100
        ],
        "beziers": [
            null
        ]
    },
    {
        "i": {
            "x": [
                0.833
            ],
            "y": [
                1.003
            ]
        },
        "o": {
            "x": [
                0.604
            ],
            "y": [
                -0.006
            ]
        },
        "t": 14,
        "s": [
            0
        ],
        "beziers": [
            null
        ]
    },
    {
        "i": {
            "x": [
                0.591
            ],
            "y": [
                0.994
            ]
        },
        "o": {
            "x": [
                0.272
            ],
            "y": [
                0.004
            ]
        },
        "t": 39,
        "s": [
            100
        ],
        "beziers": [
            null
        ]
    },
    {
        "t": 59.0000024031193,
        "s": [
            0
        ]
    }
]

lt = [
        {
          "i": {
            "x": [
              0.833
            ],
            "y": [
              1.067
            ]
          },
          "o": {
            "x": [
              0.66
            ],
            "y": [
              0
            ]
          },
          "t": 28,
          "s": [
            0
          ],
          "e": [
            -12
          ]
        },
        {
          "i": {
            "x": [
              0.068
            ],
            "y": [
              0.995
            ]
          },
          "o": {
            "x": [
              0.18
            ],
            "y": [
              0.126
            ]
          },
          "t": 34,
          "s": [
            -12
          ],
          "e": [
            12
          ]
        },
        {
          "t": 41,
          "s": [
            12
          ]
        }
      ];


drawLottieCurve(lt, 'green')
// drawLottieCurve(lt2, 'red')