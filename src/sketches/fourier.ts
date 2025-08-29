import p5 from "p5";

type FourierComponent = {
  re: number;
  im: number;
  freq: number;
  amp: number;
  phase: number;
};

class Complex {
  re: number;
  im: number;
  constructor(a = 0, b = 0) {
    this.re = a;
    this.im = b;
  }
  mult(c: Complex) {
    const re = this.re * c.re - this.im * c.im;
    const im = this.re * c.im + this.im * c.re;
    return new Complex(re, im);
  }
  add(c: Complex) {
    this.re += c.re;
    this.im += c.im;
  }
}

function dft(x: Complex[]): FourierComponent[] {
  const X: FourierComponent[] = [];
  const N = x.length;
  if (N === 0) return X;

  for (let k = 0; k < N; k++) {
    let sum = new Complex(0, 0);
    for (let n = 0; n < N; n++) {
      const phi = (Math.PI * 2 * k * n) / N;
      const c = new Complex(Math.cos(phi), -Math.sin(phi));
      sum.add(x[n].mult(c));
    }
    sum.re = sum.re / N;
    sum.im = sum.im / N;

    const freq = k;
    const amp = Math.sqrt(sum.re * sum.re + sum.im * sum.im);
    const phase = Math.atan2(sum.im, sum.re);
    X[k] = { re: sum.re, im: sum.im, freq, amp, phase };
  }

  // sorting by amplitude often gives nicer-looking epicycle order
  X.sort((a, b) => b.amp - a.amp);
  return X;
}

// Exported p5 sketch function
const fourierSketch = (q: p5) => {
  // state
  let drawmode = false; // toggled via window.flipFourier()
  let user = false;
  let x: Complex[] = [];
  let y: Complex[] = [];
  let fourierX: FourierComponent[] = [];
  let fourierY: FourierComponent[] = [];
  let time = 0;
  let path: p5.Vector[] = [];
  let drawing: p5.Vector[] = [];
  let speed = 60;

  // expose toggle so your React UI can call it
  (window as any).flipFourier = () => {
    drawmode = !drawmode;
    drawing = [];
    x = [];
    time = 0;
    path = [];
  };

  q.mousePressed = function () {
    if (drawmode) {
      drawing = [];
      user = true;
      x = [];
      time = 0;
      path = [];
    }
  };

  q.mouseReleased = function () {
    if (drawmode) {
      user = false;
      x = drawing.map((v) => new Complex(v.x - q.width / 2, v.y - q.height / 2));
      fourierX = dft(x);
    }
  };

  q.setup = function () {
    // Get parent size
    const parent = (q as any).canvas.parentElement;
    const parentWidth = parent ? parent.offsetWidth : q.windowWidth;
    const parentHeight = parent ? parent.offsetHeight : q.windowHeight;

    q.createCanvas(parentWidth, parentHeight);
    q.pixelDensity(1);
    q.frameRate(60);
    q.background(0);

    // Make the canvas scale to its parent (so it fills the panel visually)
    (q as any).canvas.style.width = "100%";
    (q as any).canvas.style.height = "100%";
    (q as any).canvas.style.display = "block";

    // Build a default preset (circle) so the sketch shows something immediately
    const N = 200;
    const R = Math.min(q.width, q.height) * 0.35;
    const pts: Complex[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new Complex(Math.cos(a) * R, Math.sin(a) * R));
    }
    y = pts;
    fourierY = dft(y);

    // If your other code exposes `nnpath` globally (as an array of {x,y}), prefer that:
    const globalAny = window as any;
    if (globalAny.nnpath && Array.isArray(globalAny.nnpath) && globalAny.nnpath.length > 0) {
      y = globalAny.nnpath.map((pt: any) => new Complex(pt.x - q.width / 2, pt.y - q.height / 2));
      fourierY = dft(y);
    }

    fourierX = dft(x);
  };

  function epicycles(cx: number, cy: number, rotation: number, fourier: FourierComponent[]) {
    let x = cx;
    let y = cy;

    for (let i = 0; i < fourier.length; i++) {
      const prevx = x;
      const prevy = y;
      const freq = fourier[i].freq;
      const radius = fourier[i].amp;
      const phase = fourier[i].phase;

      x += radius * Math.cos(freq * time + phase + rotation);
      y += radius * Math.sin(freq * time + phase + rotation);

      q.stroke(255, 100);
      q.noFill();
      q.ellipse(prevx, prevy, radius * 2, radius * 2);
      q.stroke(255);
      q.line(prevx, prevy, x, y);
    }

    return q.createVector(x, y);
  }

  q.draw = function () {
    q.frameRate(speed);
    q.background(0);

    // if drawmode and user is actively drawing with mouse
    if (drawmode && user) {
      q.background(0);
      const point = q.createVector(q.mouseX, q.mouseY);
      drawing.push(point);

      q.stroke(255, 255, 0);
      q.noFill();
      q.beginShape();
      for (const v of drawing) {
        q.vertex(v.x, v.y);
      }
      q.endShape();
      return;
    }

    // if drawmode and user finished drawing -> animate from fourierX
    if (drawmode && fourierX.length > 0) {
      const v = epicycles(q.width / 2, q.height / 2, 0, fourierX);
      path.unshift(v);

      q.stroke(255, 255, 0);
      q.noFill();
      q.beginShape();
      for (let i = 0; i < path.length; i++) q.vertex(path[i].x, path[i].y);
      q.endShape();

      const dt = (Math.PI * 2) / Math.max(1, fourierX.length);
      time += dt;

      if (time > Math.PI * 2) {
        time = 0;
        drawing = [];
        path = [];
      }

      return;
    }

    // default: draw animation based on fourierY (preset path) if available
    if (fourierY && fourierY.length > 0) {
      const v = epicycles(q.width / 2, q.height / 2, 0, fourierY);
      path.unshift(v);

      q.stroke(255, 255, 0);
      q.noFill();
      q.beginShape();
      for (let i = 0; i < path.length; i++) q.vertex(path[i].x, path[i].y);
      q.endShape();

      const dt = (Math.PI * 2) / Math.max(1, fourierY.length);
      time += dt;

      if (time > Math.PI * 2) {
        time = 0;
        path = [];
      }

      return;
    }

    // fallback (shouldn't happen now because we build a default circle)
    q.fill(255);
    q.textAlign(q.CENTER, q.CENTER);
    q.textSize(14);
    q.text("(fourier sketch) no data", q.width / 2, q.height / 2);
  };

  // responsive resizing: resize canvas buffer when window resizes so drawing isn't blurry
  q.windowResized = function () {
    const parent = (q as any).canvas.parentElement;
    const parentWidth = parent ? parent.offsetWidth : q.windowWidth;
    const parentHeight = parent ? parent.offsetHeight : q.windowHeight;
    q.resizeCanvas(parentWidth, parentHeight);
  };
};

export default fourierSketch;
