/**
 * フーリエ級数シミュレーター
 */

// ==========================================
// Sketch 1: 音と周波数 (Sound Demo)
// ==========================================
const sketchSound = (p) => {
    let osc;
    let playing = false;
    let freqSlider;
    let valFreq;
    let btnPlay, btnStop;
    
    // 波形描画用
    let time = 0;

    p.setup = () => {
        let container = document.getElementById('canvas-sound-holder');
        let w = container ? container.clientWidth : 600;
        let h = 200;
        p.createCanvas(w, h);
        
        // オシレーター初期化 (Sine波)
        // p5.soundがロードされていない場合の対策
        if (typeof p5.Oscillator === 'undefined') {
            console.error('p5.sound library is not loaded.');
            return;
        }
        
        osc = new p5.Oscillator('sine');
        
        // UI要素取得
        freqSlider = document.getElementById('slider-freq');
        valFreq = document.getElementById('val-freq');
        btnPlay = document.getElementById('btn-play');
        btnStop = document.getElementById('btn-stop');

        // イベント設定
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                if (!playing) {
                    // ユーザーアクションをトリガーにAudioContextを開始 (重要)
                    p.userStartAudio().then(() => {
                        osc.start();
                        osc.amp(0.5, 0.1); // 音量0.5へ0.1秒かけてフェードイン
                        playing = true;
                    });
                }
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => {
                if (playing) {
                    osc.amp(0, 0.1); // フェードアウト
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
    };

    p.draw = () => {
        p.background(250);
        
        // UI要素がまだ取得できていない場合は描画しない
        if (!freqSlider) return;

        let f = parseFloat(freqSlider.value);

        // 波形の描画 (音が出ていなくてもイメージとして描画)
        p.stroke(0);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        
        // 時間tを進める速度は周波数に比例させる (視覚的にわかりやすく)
        let speed = f * 0.0005; 
        time += speed;

        for (let x = 0; x < p.width; x++) {
            // 視覚化用の波形: 振幅50px
            // 波長も周波数に応じて変える
            let angle = p.map(x, 0, p.width, 0, p.TWO_PI * (f / 50)); 
            let y = p.height / 2 - Math.sin(angle - time * 10) * 50;
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

    // 状態
    let currentFunc = 'square';
    let N = 1;

    // 定数
    const SCALE_X = 50; // x軸スケール (1単位 = 50px)
    const SCALE_Y = 80; // y軸スケール

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

        // 軸の描画
        drawAxes();

        // 1. ターゲット関数（正解）の描画
        p.stroke(180);
        p.strokeWeight(4);
        p.noFill();
        p.strokeJoin(p.ROUND);
        p.beginShape();
        for (let x = -p.width/2; x < p.width/2; x += 2) {
            let t = x / SCALE_X; // 数学座標のx
            let y = getTargetValue(t);
            p.vertex(x, -y * SCALE_Y); // p5はy下向きなので反転
        }
        p.endShape();

        // 2. 近似関数（フーリエ級数）の描画
        p.stroke('#E65100'); // オレンジ
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
        // X軸
        p.line(-p.width/2, 0, p.width/2, 0);
        // Y軸
        p.line(0, -p.height/2, 0, p.height/2);
        
        // 目盛り (PIごと)
        p.fill(0); p.noStroke(); p.textSize(12); p.textAlign(p.CENTER, p.TOP);
        let piPixels = Math.PI * SCALE_X;
        // 画面内に収まる範囲で描画
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
        // x を -PI ~ PI の範囲に正規化
        let phase = (x + Math.PI) % (2 * Math.PI) - Math.PI; 
        if(phase < -Math.PI) phase += 2*Math.PI;

        switch (currentFunc) {
            case 'square':
                // 矩形波: sign(sin(x))
                return Math.sin(x) >= 0 ? 1 : -1;
            case 'sawtooth':
                // ノコギリ波: x (ただし -PI < x < PI)
                return phase / 2; // 振幅を少し抑える
            case 'parabola':
                // 放物線波: x^2 (正規化)
                return (phase * phase) / 4; // スケール調整
            default:
                return 0;
        }
    }

    // フーリエ級数の計算
    function getFourierSum(x, nMax) {
        let sum = 0;
        switch (currentFunc) {
            case 'square':
                // 4/pi * sum( sin((2n-1)x)/(2n-1) )
                for (let n = 1; n <= nMax; n++) {
                    let k = 2 * n - 1; 
                    sum += Math.sin(k * x) / k;
                }
                sum *= (4 / Math.PI);
                return sum;

            case 'sawtooth':
                // Sawtooth (y=x/2 on [-pi, pi]): sum( (-1)^(n+1) * sin(nx)/n )
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? 1 : -1;
                    sum += sign * Math.sin(n * x) / n;
                }
                return sum;

            case 'parabola':
                // Parabola (y=x^2/4 on [-pi, pi]):
                // a0/2 + sum( an cos nx )
                // x^2 のフーリエ級数は pi^2/3 + 4 sum (-1)^n cos(nx)/n^2
                // これを 1/4 倍する
                
                // 定数項: (pi^2/3) / 4
                sum = (Math.PI * Math.PI) / 12;
                
                for (let n = 1; n <= nMax; n++) {
                    let sign = (n % 2 === 1) ? -1 : 1; 
                    sum += (sign * Math.cos(n * x) / (n * n)); // *4 は 1/4で相殺
                }
                return sum;
                
            default:
                return 0;
        }
    }

    function updateMathJax() {
        if (!mathDiv) return;
        
        let tex = "";
        let nStr = N > 5 ? "5" : N; 

        if (currentFunc === 'square') {
            tex = "f(x) \\approx \\frac{4}{\\pi} \\left( ";
            let terms = [];
            for(let n=1; n<=nStr; n++) {
                let k = 2*n-1;
                if(k===1) terms.push("\\sin x");
                else terms.push(`\\frac{\\sin ${k}x}{${k}}`);
            }
            tex += terms.join(" + ");
            if(N > 5) tex += " + \\dots";
            tex += " \\right)";
        } 
        else if (currentFunc === 'sawtooth') {
            tex = "f(x) \\approx ";
            let terms = [];
            for(let n=1; n<=nStr; n++) {
                let term = "";
                if(n===1) term = "\\sin x";
                else term = `\\frac{\\sin ${n}x}{${n}}`;
                
                if(n > 1) { 
                    if(n % 2 === 1) terms.push(" + " + term);
                    else terms.push(" - " + term);
                } else {
                    terms.push(term);
                }
            }
            tex += terms.join("");
            if(N > 5) tex += " \\dots";
        }
        else if (currentFunc === 'parabola') {
            tex = "f(x) \\approx \\frac{\\pi^2}{12} + ";
            let terms = [];
            for(let n=1; n<=nStr; n++) {
                let term = "";
                if(n===1) term = "\\cos x";
                else term = `\\frac{\\cos ${n}x}{${n*n}}`;

                if(n % 2 === 1) terms.push((n===1 ? "-" : " - ") + term);
                else terms.push(" + " + term);
            }
            tex += terms.join("");
            if(N > 5) tex += " \\dots";
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

// インスタンスモードでスケッチを起動
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