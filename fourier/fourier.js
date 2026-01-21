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
    
    // 波形描画用
    let time = 0;

    p.setup = () => {
        let container = document.getElementById('canvas-sound-holder');
        let w = container ? container.clientWidth : 600;
        let h = 200;
        p.createCanvas(w, h);
        
        if (typeof p5.Oscillator === 'undefined') {
            console.error('p5.sound library is not loaded.');
            return;
        }
        
        osc = new p5.Oscillator('sine');
        
        // UI要素取得
        freqSlider = document.getElementById('slider-freq');
        valFreq = document.getElementById('val-freq');
        ampSlider = document.getElementById('slider-amp');
        valAmp = document.getElementById('val-amp');
        btnPlay = document.getElementById('btn-play');
        btnStop = document.getElementById('btn-stop');

        // イベント設定
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (!playing) {
                    p.userStartAudio().then(() => {
                        osc.start();
                        // 現在のスライダー値でフェードイン
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

        // 周波数スライダー
        if (freqSlider) {
            freqSlider.addEventListener('input', () => {
                if (valFreq) valFreq.textContent = freqSlider.value;
                if (playing) {
                    osc.freq(parseFloat(freqSlider.value), 0.1);
                }
            });
        }

        // 振幅スライダー
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

        // 波形の描画
        p.stroke(0);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        
        let speed = f * 0.0005; 
        time += speed;

        // 最大振幅を画面の高さの40%程度とする (a=1のとき)
        let maxH = p.height * 0.4;

        for (let x = 0; x < p.width; x++) {
            // angle: 画面幅の中で波がいくつか見えるように調整
            let angle = p.map(x, 0, p.width, 0, p.TWO_PI * (f / 50)); 
            
            // y = center - A * sin(...) 
            // 振幅スライダー(a)を反映させる
            let y = p.height / 2 - (a * maxH) * Math.sin(angle - time * 10);
            p.vertex(x, y);
        }
        p.endShape();

        // 中心軸
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

        // 1. ターゲット関数
        p.stroke(180);
        p.strokeWeight(4);
        p.noFill();
        p.strokeJoin(p.ROUND);
        p.beginShape();
        // x範囲を少し広めに取る
        for (let x = -p.width/2; x < p.width/2; x += 2) {
            let t = x / SCALE_X;
            let y = getTargetValue(t);
            p.vertex(x, -y * SCALE_Y);
        }
        p.endShape();

        // 2. 近似関数
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

    // ターゲット関数の定義 (周期 2PI)
    function getTargetValue(x) {
        // -PI ~ PI に正規化
        let phase = (x + Math.PI) % (2 * Math.PI) - Math.PI; 
        if(phase < -Math.PI) phase += 2*Math.PI;

        switch (currentFunc) {
            case 'square':
                return Math.sin(x) >= 0 ? 1 : -1;
            case 'sawtooth':
                return phase / 2; 
            case 'parabola':
                return (phase * phase) / 4; 
            case 'abs_x':
                // |x|
                return Math.abs(phase);
            case 'cubic':
                // x^3 / 10 (スケール調整)
                return (phase * phase * phase) / 10;
            default:
                return 0;
        }
    }

    // フーリエ級数の計算
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
                return sum; // (1/2 scale already in target)

            case 'parabola':
                // x^2 on [-pi, pi] => pi^2/3 + 4 sum (-1)^n cos(nx)/n^2
                // Target is x^2/4, so divide series by 4
                sum = (Math.PI * Math.PI) / 12; // Const
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? -1 : 1; 
                    sum += (sign * Math.cos(n * x) / (n * n));
                }
                return sum;

            case 'abs_x':
                // |x| on [-pi, pi] => pi/2 - 4/pi sum_{odd} cos(nx)/n^2
                sum = Math.PI / 2;
                for (let n = 1; n <= nMax; n++) {
                    let k = 2 * n - 1; // odd only
                    sum -= (4 / Math.PI) * Math.cos(k * x) / (k * k);
                }
                return sum;

            case 'cubic':
                // x^3 on [-pi, pi] => sum (-1)^n * (12/n^3 - 2pi^2/n) sin(nx)
                // Target is x^3 / 10
                // b_n for x^3 is (-1)^n * (2*pi^2*n^2 - 12)/n^3 ? 
                // Let's use the formula: b_n = 2/pi * int_0^pi x^3 sin(nx) dx
                // = (-1)^n * 2 * (pi^2/n - 6/n^3)
                // So series is: sum_{n=1} (-1)^n * 2 * (pi^2/n - 6/n^3) * sin(nx)
                // Divide by 10 for target match.
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? 1 : -1; // sin(x): n=1 -> +
                    // Note: formula typically has (-1)^(n) or (-1)^(n+1).
                    // x^3 starts positive for x>0. sin(x) is positive.
                    // For n=1: b1 = 2(pi^2 - 6) > 0. sin(x) coeff should be positive.
                    // Formula check: (-1)^n * ... for n=1 is negative. 
                    // Usually b_n = (-1)^(n+1) ...
                    
                    // Let's compute coefficient value directly:
                    // bn = (-1)^(n) * 2 * (6/(n^3) - (pi^2)/n)
                    // if n=1: -1 * 2 * (6 - 9.8) = -2 * -3.8 = +7.6. Correct.
                    
                    let coeff = Math.pow(-1, n) * 2 * (6 / Math.pow(n, 3) - (Math.PI * Math.PI) / n);
                    sum += coeff * Math.sin(n * x);
                }
                return sum / 10;

            default:
                return 0;
        }
    }

    function updateMathJax() {
        if (!mathDiv) return;
        
        let tex = "";
        let nStr = N > 5 ? "5" : N; 

        if (currentFunc === 'square') {
            tex = "f(x) \\approx \\frac{4}{\\pi} \\sum_{n=1}^{N} \\frac{\\sin((2n-1)x)}{2n-1}";
        } 
        else if (currentFunc === 'sawtooth') {
            tex = "f(x) \\approx \\sum_{n=1}^{N} (-1)^{n+1} \\frac{\\sin(nx)}{n}";
        }
        else if (currentFunc === 'parabola') {
            tex = "f(x) \\approx \\frac{\\pi^2}{12} + \\sum_{n=1}^{N} (-1)^{n} \\frac{\\cos(nx)}{n^2}";
        }
        else if (currentFunc === 'abs_x') {
            tex = "f(x) \\approx \\frac{\\pi}{2} - \\frac{4}{\\pi} \\sum_{n=1, odd}^{N} \\frac{\\cos(nx)}{n^2}";
        }
        else if (currentFunc === 'cubic') {
            tex = "f(x) \\approx \\frac{1}{5} \\sum_{n=1}^{N} (-1)^{n} \\left( \\frac{6}{n^3} - \\frac{\\pi^2}{n} \\right) \\sin(nx)";
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