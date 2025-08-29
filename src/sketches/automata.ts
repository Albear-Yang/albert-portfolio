import p5 from "p5";

class Dot {
  re: number; // red channel (0..1)
  bl: number; // blue channel (0..1)
  gr: number; // green channel (0..1)
  constructor(red = 0, blue = 0, green = 0) {
    this.re = red;
    this.bl = blue;
    this.gr = green;
  }

  // returns [r,g,b] in 0..255 range for writing into pixels
  calculateColour(): [number, number, number] {
    const max = Math.max(this.re, this.bl, this.gr);
    if (max === this.re) return [11, 11, 11];
    if (max === this.bl) return [255, 255, 255];
    if (max === this.gr) return [255, 255, 255];
    // fallback
    const r = Math.floor(this.re * 255);
    const g = Math.floor(this.gr * 255);
    const b = Math.floor(this.bl * 255);
    return [r, g, b];
  }
}

function getAvg(
  a: Dot,
  b: Dot,
  c: Dot,
  d: Dot,
  e: Dot,
  f: Dot,
  g: Dot,
  h: Dot,
  i: Dot
): Dot {
  const red = a.re + b.re + c.re + d.re + e.re + f.re + g.re + h.re + i.re;
  const blue = a.bl + b.bl + c.bl + d.bl + e.bl + f.bl + g.bl + h.bl + i.bl;
  const green = a.gr + b.gr + c.gr + d.gr + e.gr + f.gr + g.gr + h.gr + i.gr;

  const A = red / 9;
  const B = blue / 9;
  const C = green / 9;

  let newRed = A + A * (B - 0.8333333 * C);
  let newBlue = B + B * (0.8333333 * C - A);
  let newGreen = C + C * (0.8333333 * A - 0.8333333 * B);

  if (newRed > 1 || newBlue > 1 || newGreen > 1) {
    newRed *= 0.9;
    newBlue *= 0.9;
    newGreen *= 0.9;
  }

  return new Dot(newRed, newBlue, newGreen);
}

const podgeSketch = (p: p5) => {
  let map: Dot[][] = [];

  p.setup = () => {
    const size = Math.floor(Math.max(300, Math.min(p.windowWidth / 3, p.windowHeight / 3)));
    p.createCanvas(size, size);
    p.pixelDensity(1);
    p.noStroke();
    p.frameRate(12);
    p.background(0);

    // initialize map
    map = new Array(p.height);
    for (let i = 0; i < p.height; i++) {
      map[i] = new Array(p.width);
      for (let j = 0; j < p.width; j++) {
        map[i][j] = new Dot(Math.random(), Math.random(), Math.random());
      }
    }
  };

  p.draw = () => {
    p.loadPixels();

    // write current map into pixels
    for (let y = 0; y < p.height; y++) {
      for (let x = 0; x < p.width; x++) {
        const idx = (x + y * p.width) * 4;
        const [r, g, b] = map[y][x].calculateColour();
        p.pixels[idx] = r;
        p.pixels[idx + 1] = g;
        p.pixels[idx + 2] = b;
        p.pixels[idx + 3] = 255;
      }
    }

    // compute next map using 3x3 neighborhood with toroidal wrap
    const newMap: Dot[][] = new Array(p.height);
    for (let z = 0; z < p.height; z++) {
      newMap[z] = new Array(p.width);
      for (let x = 0; x < p.width; x++) {
        const h = p.height;
        const w = p.width;
        const a = map[(z - 1 + h) % h][(x - 1 + w) % w];
        const b = map[(z - 1 + h) % h][x % w];
        const c = map[(z - 1 + h) % h][(x + 1) % w];
        const d = map[z][(x - 1 + w) % w];
        const e = map[z][x % w];
        const f = map[z][(x + 1) % w];
        const g2 = map[(z + 1) % h][(x - 1 + w) % w];
        const h2 = map[(z + 1) % h][x % w];
        const i2 = map[(z + 1) % h][(x + 1) % w];

        newMap[z][x] = getAvg(a, b, c, d, e, f, g2, h2, i2);
      }
    }

    map = newMap;

    p.updatePixels();
  };

  p.mouseClicked = () => {
    // reseed random colors on click
    for (let i = 0; i < p.height; i++) {
      for (let j = 0; j < p.width; j++) {
        map[i][j] = new Dot(Math.random(), Math.random(), Math.random());
      }
    }
  };

  // resize handling so the canvas stays reasonable when the container resizes
  p.windowResized = () => {
    const size = Math.floor(Math.max(300, Math.min(p.windowWidth / 2, p.windowHeight / 2)));
    p.resizeCanvas(size, size);

    // reinitialize map to match new size
    map = new Array(p.height);
    for (let i = 0; i < p.height; i++) {
      map[i] = new Array(p.width);
      for (let j = 0; j < p.width; j++) {
        map[i][j] = new Dot(Math.random(), Math.random(), Math.random());
      }
    }
  };
};

export default podgeSketch;
