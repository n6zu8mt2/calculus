/**
 * フーリエ級数シミュレーター
 */

// ==========================================
// Sketch 1: 音と周波数 (Sound Demo)
// ==========================================
const sketchSound = (p) => {
    let osc;
    let playing = false;
    let freqSlider, ampSlider;
    let valFreq, valAmp;
    let btnPlay, btnStop;
    let time = 0;

    p.setup = () => {
        let container = document.getElementById('canvas-sound-holder');
        let w = container ? container.clientWidth : 600;
        let h = 200;
        p.createCanvas(w, h);
        
        if (typeof p5.Oscillator === 'undefined') {
            return;
        }
        
        osc = new p5.Oscillator('sine');
        
        freqSlider = document.getElementById('slider-freq');
        valFreq = document.getElementById('val-freq');
        ampSlider = document.getElementById('slider-amp');
        valAmp = document.getElementById('val-amp');
        btnPlay = document.getElementById('btn-play');
        btnStop = document.getElementById('btn-stop');

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (!playing) {
                    p.userStartAudio().then(() => {
                        osc.start();
                        let amp = parseFloat(ampSlider.value);
                        osc.amp(amp, 0.1); 
                        playing = true;
                    });
                }
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => {
                if (playing) {
                    osc.amp(0, 0.1); 
                    setTimeout(() => {
                        osc.stop();
                        playing = false;
                    }, 100);
                }
            });
        }

        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                if (valFreq) valFreq.textContent = freqSlider.value;
                if (playing) {
                    osc.freq(parseFloat(freqSlider.value), 0.1);
                }
            });
        }

        if (ampSlider) {
            ampSlider.addEventListener('input', () => {
                let v = parseFloat(ampSlider.value);
                if (valAmp) valAmp.textContent = v.toFixed(2);
                if (playing) {
                    osc.amp(v, 0.1);
                }
            });
        }
    };

    p.draw = () => {
        p.background(250);
        
        if (!freqSlider || !ampSlider) return;

        let f = parseFloat(freqSlider.value);
        let a = parseFloat(ampSlider.value);

        p.stroke(0);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        
        let speed = f * 0.0005; 
        time += speed;

        let maxH = p.height * 0.4;

        for (let x = 0; x < p.width; x++) {
            let angle = p.map(x, 0, p.width, 0, p.TWO_PI * (f / 50)); 
            let y = p.height / 2 - (a * maxH) * Math.sin(angle - time * 10);
            p.vertex(x, y);
        }
        p.endShape();

        p.stroke(200);
        p.strokeWeight(1);
        p.line(0, p.height/2, p.width, p.height/2);
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-sound-holder');
        if(container) p.resizeCanvas(container.clientWidth, 200);
    };
};

// ==========================================
// Sketch 2: フーリエ級数展開 (Fourier Series)
// ==========================================
const sketchSeries = (p) => {
    let funcSelect;
    let nSlider, nVal;
    let mathDiv;

    let currentFunc = 'square';
    let N = 1;

    const SCALE_X = 50; 
    const SCALE_Y = 80;

    p.setup = () => {
        let container = document.getElementById('canvas-series-holder');
        let w = container ? container.clientWidth : 600;
        let h = 350;
        p.createCanvas(w, h);

        funcSelect = document.getElementById('func-select');
        nSlider = document.getElementById('slider-n');
        nVal = document.getElementById('val-n');
        mathDiv = document.getElementById('math-formula');

        if (funcSelect) {
            funcSelect.addEventListener('change', () => {
                currentFunc = funcSelect.value;
                updateMathJax();
            });
        }

        if (nSlider) {
            nSlider.addEventListener('input', () => {
                N = parseInt(nSlider.value);
                if (nVal) nVal.textContent = N;
                updateMathJax();
            });
        }

        updateMathJax();
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2);

        drawAxes();

        // ターゲット関数
        p.stroke(180);
        p.strokeWeight(4);
        p.noFill();
        p.strokeJoin(p.ROUND);
        p.beginShape();
        for (let x = -p.width/2; x < p.width/2; x += 2) {
            let t = x / SCALE_X;
            let y = getTargetValue(t);
            p.vertex(x, -y * SCALE_Y);
        }
        p.endShape();

        // 近似関数
        p.stroke('#E65100');
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        for (let x = -p.width/2; x < p.width/2; x += 2) {
            let t = x / SCALE_X;
            let y = getFourierSum(t, N);
            p.vertex(x, -y * SCALE_Y);
        }
        p.endShape();
    };

    function drawAxes() {
        p.stroke(0);
        p.strokeWeight(1);
        p.line(-p.width/2, 0, p.width/2, 0);
        p.line(0, -p.height/2, 0, p.height/2);
        
        p.fill(0); p.noStroke(); p.textSize(12); p.textAlign(p.CENTER, p.TOP);
        let piPixels = Math.PI * SCALE_X;
        let maxPi = Math.ceil((p.width/2) / piPixels);
        
        for(let i = -maxPi; i <= maxPi; i++) {
            if(i===0) continue;
            let label = i === 1 ? "π" : (i === -1 ? "-π" : i + "π");
            p.text(label, i * piPixels, 5);
            p.stroke(0); p.line(i * piPixels, -3, i * piPixels, 3);
        }
    }

    function getTargetValue(x) {
        let phase = (x + Math.PI) % (2 * Math.PI) - Math.PI; 
        if(phase < -Math.PI) phase += 2*Math.PI;

        switch (currentFunc) {
            case 'square': return Math.sin(x) >= 0 ? 1 : -1;
            case 'sawtooth': return phase / 2; 
            case 'parabola': return (phase * phase) / 4; 
            case 'abs_x': return Math.abs(phase);
            case 'cubic': return (phase * phase * phase) / 10;
            default: return 0;
        }
    }

    function getFourierSum(x, nMax) {
        let sum = 0;
        switch (currentFunc) {
            case 'square':
                for (let n = 1; n <= nMax; n++) {
                    let k = 2 * n - 1; 
                    sum += Math.sin(k * x) / k;
                }
                return sum * (4 / Math.PI);

            case 'sawtooth':
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? 1 : -1;
                    sum += sign * Math.sin(n * x) / n;
                }
                return sum; 

            case 'parabola':
                sum = (Math.PI * Math.PI) / 12; 
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? -1 : 1; 
                    sum += (sign * Math.cos(n * x) / (n * n));
                }
                return sum;

            case 'abs_x':
                sum = Math.PI / 2;
                for (let n = 1; n <= nMax; n++) {
                    let k = 2 * n - 1; 
                    sum -= (4 / Math.PI) * Math.cos(k * x) / (k * k);
                }
                return sum;

            case 'cubic':
                for (let n = 1; n <= nMax; n++) {
                    let coeff = Math.pow(-1, n) * 2 * (6 / Math.pow(n, 3) - (Math.PI * Math.PI) / n);
                    sum += coeff * Math.sin(n * x);
                }
                return sum / 10;

            default: return 0;
        }
    }

    // 数式表示の更新 (項の羅列)
    function updateMathJax() {
        if (!mathDiv) return;
        
        let tex = "";
        const showLimit = 3; // 具体的に表示する項数の上限

        // 数式生成ヘルパー
        // terms: { sign: " + " | " - ", latex: string }[]
        const buildFormula = (prefix, terms, factorStr = "") => {
            let s = prefix;
            if (factorStr) s += factorStr + " \\left( ";
            
            terms.forEach((t, i) => {
                if (i === 0) {
                    if (t.sign.includes("-")) s += "-";
                    s += t.latex;
                } else {
                    s += t.sign + t.latex;
                }
            });
            
            if (factorStr) s += " \\right)";
            return s;
        };

        let terms = [];

        if (currentFunc === 'square') {
            for (let n = 1; n <= Math.min(N, showLimit); n++) {
                let k = 2 * n - 1;
                let val = k === 1 ? "\\sin x" : `\\frac{\\sin ${k}x}{${k}}`;
                terms.push({ sign: " + ", latex: val });
            }
            if (N > showLimit) {
                terms.push({ sign: " + ", latex: "\\cdots" });
                let k = 2 * N - 1;
                let val = `\\frac{\\sin ${k}x}{${k}}`;
                terms.push({ sign: " + ", latex: val });
            }
            tex = "f(x) \\approx " + buildFormula("", terms, "\\frac{4}{\\pi}");
        } 
        else if (currentFunc === 'sawtooth') {
            for (let n = 1; n <= Math.min(N, showLimit); n++) {
                let val = n === 1 ? "\\sin x" : `\\frac{\\sin ${n}x}{${n}}`;
                let sign = (n % 2 === 1) ? " + " : " - ";
                terms.push({ sign: sign, latex: val });
            }
            if (N > showLimit) {
                terms.push({ sign: " + ", latex: "\\cdots" });
                let val = `\\frac{\\sin ${N}x}{${N}}`;
                let sign = (N % 2 === 1) ? " + " : " - ";
                terms.push({ sign: sign, latex: val });
            }
            tex = "f(x) \\approx " + buildFormula("", terms, "2");
        }
        else if (currentFunc === 'parabola') {
            for (let n = 1; n <= Math.min(N, showLimit); n++) {
                let val = n === 1 ? "\\cos x" : `\\frac{\\cos ${n}x}{${n*n}}`;
                let sign = (n % 2 === 1) ? " - " : " + ";
                terms.push({ sign: sign, latex: val });
            }
            if (N > showLimit) {
                terms.push({ sign: " + ", latex: "\\cdots" });
                let val = `\\frac{\\cos ${N}x}{${N*N}}`;
                let sign = (N % 2 === 1) ? " - " : " + ";
                terms.push({ sign: sign, latex: val });
            }
            tex = "f(x) \\approx " + buildFormula("\\frac{\\pi^2}{12} ", terms);
        }
        else if (currentFunc === 'abs_x') {
            for (let n = 1; n <= Math.min(N, showLimit); n++) {
                let k = 2 * n - 1;
                let val = k === 1 ? "\\cos x" : `\\frac{\\cos ${k}x}{${k*k}}`;
                terms.push({ sign: " + ", latex: val });
            }
            if (N > showLimit) {
                terms.push({ sign: " + ", latex: "\\cdots" });
                let k = 2 * N - 1;
                let val = `\\frac{\\cos ${k}x}{${k*k}}`;
                terms.push({ sign: " + ", latex: val });
            }
            tex = "f(x) \\approx " + buildFormula("\\frac{\\pi}{2} ", terms, " - \\frac{4}{\\pi}");
        }
        else if (currentFunc === 'cubic') {
            const getCubicTerm = (n) => {
                let coeff = "";
                if (n===1) coeff = "(\\pi^2 - 6)";
                else coeff = `\\left(\\frac{\\pi^2}{${n}} - \\frac{6}{${n}^3}\\right)`;
                return `${coeff} \\sin ${n}x`;
            };

            for (let n = 1; n <= Math.min(N, showLimit); n++) {
                let mag = getCubicTerm(n);
                let sign = (n % 2 === 1) ? " + " : " - ";
                terms.push({ sign: sign, latex: mag });
            }
            if (N > showLimit) {
                terms.push({ sign: " + ", latex: "\\cdots" });
                let mag = getCubicTerm(N);
                let sign = (N % 2 === 1) ? " + " : " - ";
                terms.push({ sign: sign, latex: mag });
            }
            tex = "f(x) \\approx " + buildFormula("", terms, "\\frac{1}{5}");
        }

        mathDiv.innerHTML = `$$ ${tex} $$`;
        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([mathDiv]);
        }
    }

    p.windowResized = () => {
        let container = document.getElementById('canvas-series-holder');
        if(container) p.resizeCanvas(container.clientWidth, 350);
    };
};

try {
    new p5(sketchSound, 'canvas-sound-holder');
} catch(e) {
    console.error("Sketch 1 failed:", e);
}

try {
    new p5(sketchSeries, 'canvas-series-holder');
} catch(e) {
    console.error("Sketch 2 failed:", e);
}