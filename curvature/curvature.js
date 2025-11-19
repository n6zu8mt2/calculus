// --- グローバル変数 ---
let p5sketch;
let curveType = 'circle';
let paramA = 100; // スケールパラメータ
let paramOmega = 1.0; // 角速度 (円用)
let t = 0;
let isPlaying = false;

// UI要素
let curveSelector, paramASlider, paramOmegaSlider, tSlider, playPauseBtn, resetBtn;
let paramAVal, paramOmegaVal, tVal;
let valPos, valE1, valE2, valKappa, valRho;
let formulaTextDiv, omegaGroupDiv;

// --- 数値計算ヘルパー ---
const h = 0.001; // 微分用微小量

// フレネル積分 (簡易数値積分)
// C(t) = integral(0 to t) cos(u^2) du
// S(t) = integral(0 to t) sin(u^2) du
function integrateFresnel(t, steps = 100) {
    let x = 0;
    let y = 0;
    const dt = t / steps;
    for (let i = 0; i < steps; i++) {
        const u = i * dt;
        x += Math.cos(u * u) * dt;
        y += Math.sin(u * u) * dt;
    }
    return { x, y };
}

// 曲線定義ライブラリ
const curves = {
    'circle': {
        label: '円',
        formula: '\\begin{cases} x(t) = a \\cos(\\omega t) \\\\ y(t) = a \\sin(\\omega t) \\end{cases}',
        tMin: 0, tMax: 2 * Math.PI,
        // x = a cos(wt), y = a sin(wt)
        func: (t, a) => ({ x: a * Math.cos(paramOmega * t), y: a * Math.sin(paramOmega * t) })
    },
    'parabola': {
        label: '放物線',
        formula: '\\begin{cases} x(t) = a t \\\\ y(t) = a t^2 \\end{cases}',
        tMin: -2, tMax: 2,
        // x = at, y = at^2 (yは見やすいように少しずらす)
        func: (t, a) => ({ x: a * t, y: a * t * t * 0.5 - 100 })
    },
    'ellipse': {
        label: '楕円',
        formula: '\\begin{cases} x(t) = 1.5a \\cos t \\\\ y(t) = 0.8a \\sin t \\end{cases}',
        tMin: 0, tMax: 2 * Math.PI,
        func: (t, a) => ({ x: a * 1.5 * Math.cos(t), y: a * 0.8 * Math.sin(t) })
    },
    'cycloid': {
        label: 'サイクロイド',
        formula: '\\begin{cases} x(t) = a(t - \\sin t) \\\\ y(t) = a(1 - \\cos t) \\end{cases}',
        tMin: -2 * Math.PI, tMax: 2 * Math.PI,
        // x = a(t - sin t), y = a(1 - cos t)
        // 画面中央に表示するため x をシフト、y は -150 オフセット
        func: (t, a) => {
            const scale = a * 0.5; // 画面に収まるよう少し縮小
            return { x: scale * (t - Math.sin(t)), y: scale * (1 - Math.cos(t)) - 150 };
        }
    },
    'clothoid': {
        label: 'クロソイド曲線',
        formula: '\\begin{cases} \\displaystyle x(t) = a \\int_0^t \\cos(u^2) du \\\\ \\displaystyle y(t) = a \\int_0^t \\sin(u^2) du \\end{cases}',
        tMin: -5, tMax: 5,
        // フレネル積分
        func: (t, a) => {
            const res = integrateFresnel(t);
            // aを掛けてスケーリング
            return { x: a * 2.0 * res.x, y: a * 2.0 * res.y };
        }
    },
    'cissoid': {
        label: 'ディオクレスのシッソイド',
        formula: '\\begin{cases} x(t) = \\frac{3a t^2}{1+t^2} \\\\ y(t) = \\frac{3a t^3}{1+t^2} \\end{cases}',
        tMin: -1.5, tMax: 1.5,
        // x = 3a t^2 / (1+t^2), y = 3a t^3 / (1+t^2) (aをスケールとして)
        func: (t, a) => {
            const scale = a * 3;
            const dem = 1 + t * t;
            return { x: scale * t * t / dem - 100, y: scale * t * t * t / dem };
        }
    },
    'lissajous': {
        label: 'リサージュ曲線',
        formula: '\\begin{cases} x(t) = a \\sin(3t) \\\\ y(t) = a \\sin(2t) \\end{cases}',
        tMin: 0, tMax: 2 * Math.PI,
        func: (t, a) => ({ x: a * Math.sin(3 * t), y: a * Math.sin(2 * t) })
    }
};

// --- 微分計算 ---

// 1階微分 (速度ベクトル)
function getDeriv1(func, t, a) {
    const p1 = func(t + h, a);
    const p0 = func(t - h, a);
    return {
        x: (p1.x - p0.x) / (2 * h),
        y: (p1.y - p0.y) / (2 * h)
    };
}

// 2階微分 (加速度ベクトル)
function getDeriv2(func, t, a) {
    const p2 = func(t + h, a);
    const p1 = func(t, a);
    const p0 = func(t - h, a);
    return {
        x: (p2.x - 2 * p1.x + p0.x) / (h * h),
        y: (p2.y - 2 * p1.y + p0.y) / (h * h)
    };
}

// 計算メインロジック
function calculateFrame(curveKey, t, a) {
    const def = curves[curveKey];
    const pos = def.func(t, a);
    const d1 = getDeriv1(def.func, t, a); // 速度 v
    const d2 = getDeriv2(def.func, t, a); // 加速度 a

    // 接線ベクトル e1 = v / |v|
    const vMag = Math.sqrt(d1.x * d1.x + d1.y * d1.y);
    const e1 = (vMag < 1e-6) ? {x:0, y:0} : { x: d1.x / vMag, y: d1.y / vMag };

    // 曲率 kappa = (x'y'' - x''y') / (x'^2 + y'^2)^(3/2)
    const numerator = d1.x * d2.y - d2.x * d1.y; // 2次元の外積
    const denominator = Math.pow(vMag, 3);
    const kappa = (denominator < 1e-6) ? 0 : numerator / denominator;

    // 法線 e2_math (e1を反時計回り90度) -> (-e1.y, e1.x)
    const e2_math = { x: -e1.y, y: e1.x };

    let rho = 0;
    let center = { x: pos.x, y: pos.y };
    
    if (Math.abs(kappa) > 1e-6) {
        rho = 1 / kappa; // 符号付き半径
        // 中心 C = P + (1/kappa) * e2 = P + rho * e2
        // ここで rho は符号付き、e2は数学的法線
        center.x = pos.x + rho * e2_math.x;
        center.y = pos.y + rho * e2_math.y;
    } else {
        rho = Infinity;
    }

    return {
        pos: pos,
        e1: e1,
        e2: e2_math,
        kappa: kappa,
        rho: Math.abs(rho),
        center: center
    };
}


// --- p5.js スケッチ ---
const sketch = (p) => {
    p.setup = () => {
        let canvas = p.createCanvas(700, 450);
        canvas.parent('canvas-holder');
        
        // UI取得
        curveSelector = p.select('#curveSelector');
        paramASlider = p.select('#paramA');
        paramOmegaSlider = p.select('#paramOmega'); // 追加
        tSlider = p.select('#tSlider');
        playPauseBtn = p.select('#playPauseBtn');
        resetBtn = p.select('#resetBtn');
        
        paramAVal = p.select('#paramAVal');
        paramOmegaVal = p.select('#paramOmegaVal'); // 追加
        tVal = p.select('#tVal');
        
        valPos = p.select('#val-pos');
        valE1 = p.select('#val-e1');
        valE2 = p.select('#val-e2');
        valKappa = p.select('#val-kappa');
        valRho = p.select('#val-rho');
        
        formulaTextDiv = document.getElementById('formula-text'); // 追加
        omegaGroupDiv = document.getElementById('omega-group'); // 追加

        // イベントリスナー
        curveSelector.changed(resetSimulation);
        paramASlider.input(() => {
            paramA = parseFloat(paramASlider.value());
            paramAVal.html(paramA);
            if(!isPlaying) p.redraw();
        });
        paramOmegaSlider.input(() => { // 追加
            paramOmega = parseFloat(paramOmegaSlider.value());
            paramOmegaVal.html(paramOmega.toFixed(1));
            if(!isPlaying) p.redraw();
        });
        tSlider.input(() => {
            t = parseFloat(tSlider.value());
            tVal.html(t.toFixed(2));
            if(!isPlaying) p.redraw();
        });
        
        playPauseBtn.mousePressed(togglePlay);
        resetBtn.mousePressed(resetSimulation);

        resetSimulation(); // 初期化
    };

    p.draw = () => {
        // アニメーション更新
        const def = curves[curveType];
        if (isPlaying) {
            const range = def.tMax - def.tMin;
            // 1フレームあたりの進み具合 (範囲に応じて調整)
            t += range / 300; 
            if (t > def.tMax) {
                t = def.tMin; // ループ
            }
            tSlider.value(t);
            tVal.html(t.toFixed(2));
        }

        p.background(255);

        // 座標系の設定 (画面中央を原点、Y軸は上向きに)
        p.translate(p.width / 2, p.height / 2);
        p.scale(1, -1); 

        drawGrid(p);

        // 1. 曲線の全体像を描画
        p.noFill();
        p.stroke(0);
        p.strokeWeight(2);
        p.beginShape();
        // 描画解像度調整
        const steps = (curveType === 'cycloid' || curveType === 'clothoid') ? 400 : 200;
        const step = (def.tMax - def.tMin) / steps;
        
        for (let ti = def.tMin; ti <= def.tMax; ti += step) {
            const pt = def.func(ti, paramA);
            p.vertex(pt.x, pt.y);
        }
        p.endShape();

        // 2. 現在の点の計算
        const info = calculateFrame(curveType, t, paramA);

        // 情報パネル更新
        updateInfoPanel(info);

        // 3. 曲率円の描画
        if (info.rho !== Infinity && info.rho < 2000) {
            p.noFill();
            p.stroke(255, 152, 0); // オレンジ
            p.strokeWeight(2);
            p.ellipse(info.center.x, info.center.y, info.rho * 2, info.rho * 2);
            
            // 中心点
            p.fill(255, 152, 0);
            p.noStroke();
            p.ellipse(info.center.x, info.center.y, 6, 6);
            
            // 半径線
            p.stroke(255, 152, 0, 100);
            p.strokeWeight(1);
            p.line(info.center.x, info.center.y, info.pos.x, info.pos.y);
        }

        // 4. ベクトルの描画
        const vecScale = 60; 
        
        // 点P
        p.fill(0); p.noStroke();
        p.ellipse(info.pos.x, info.pos.y, 10, 10);

        // 接線ベクトル e1 (青)
        drawArrow(p, info.pos, info.e1, vecScale, '#1E88E5');

        // 法線ベクトル e2 (赤)
        drawArrow(p, info.pos, info.e2, vecScale, '#E53935');
    };
    
    function drawArrow(p, base, vec, scale, color) {
        p.push();
        p.stroke(color);
        p.strokeWeight(3);
        p.fill(color);
        
        const endX = base.x + vec.x * scale;
        const endY = base.y + vec.y * scale;
        
        p.line(base.x, base.y, endX, endY);
        
        // 矢印の先端
        const angle = Math.atan2(vec.y, vec.x);
        p.translate(endX, endY);
        p.rotate(angle);
        p.triangle(0, 0, -10, 4, -10, -4); 
        p.pop();
    }

    function drawGrid(p) {
        p.stroke(220);
        p.strokeWeight(1);
        for (let x = -p.width/2; x < p.width/2; x += 50) {
            p.line(x, -p.height/2, x, p.height/2);
        }
        for (let y = -p.height/2; y < p.height/2; y += 50) {
            p.line(-p.width/2, y, p.width/2, y);
        }
        p.stroke(150);
        p.strokeWeight(2);
        p.line(-p.width/2, 0, p.width/2, 0);
        p.line(0, -p.height/2, 0, p.height/2);
    }
};

// --- 制御ロジック ---

function resetSimulation() {
    curveType = curveSelector.value();
    const def = curves[curveType];
    
    // スライダーの範囲更新
    tSlider.elt.min = def.tMin;
    tSlider.elt.max = def.tMax;
    
    // 初期値リセット
    t = def.tMin;
    tSlider.value(t);
    tVal.html(t.toFixed(2));
    
    paramA = parseFloat(paramASlider.value());
    paramOmega = parseFloat(paramOmegaSlider.value());
    
    // 円の時だけωスライダーを表示
    if (curveType === 'circle') {
        omegaGroupDiv.classList.remove('hidden');
    } else {
        omegaGroupDiv.classList.add('hidden');
    }

    // 数式の表示更新
    formulaTextDiv.innerHTML = `$$ ${def.formula} $$`;
    if (window.MathJax) {
        if (window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([formulaTextDiv]);
        } else if (window.MathJax.Hub) {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, formulaTextDiv]);
        }
    }
    
    isPlaying = false;
    playPauseBtn.html('再生 / 停止');
    playPauseBtn.removeClass('playing');
    
    if (p5sketch) p5sketch.redraw();
}

function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        p5sketch.loop();
        playPauseBtn.html('停止');
        playPauseBtn.addClass('playing');
    } else {
        p5sketch.noLoop();
        playPauseBtn.html('再生');
        playPauseBtn.removeClass('playing');
    }
}

function updateInfoPanel(info) {
    const fmt = (n) => n.toFixed(2);
    const vecFmt = (v) => `(${fmt(v.x)}, ${fmt(v.y)})`;

    valPos.html(vecFmt(info.pos));
    valE1.html(vecFmt(info.e1));
    valE2.html(vecFmt(info.e2));
    
    valKappa.html(info.kappa.toFixed(4));
    
    if (info.rho === Infinity || info.rho > 10000) {
        valRho.html("∞ (直線)");
    } else {
        valRho.html(fmt(info.rho));
    }
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    p5sketch = new p5(sketch);
});