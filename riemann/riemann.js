/**
 * 区分求積法シミュレーター
 */

// シミュレーション状態
const state = {
    funcId: 'poly_k',
    a: 0,
    b: 2,
    k: 2, // パラメータk (x^2 - kx 用)
    r: 1, // パラメータr (半円用)
    n: 5,
    method: 'left', // 'left', 'right', 'mid'
    
    // 計算結果
    approxArea: 0,
    exactArea: 0
};

// 関数定義
// f: 関数値, F: 原始関数(または定積分の計算ロジック), hasK/hasR: パラメータ有無
const functions = {
    'poly_k': {
        f: (x, params) => x * x - params.k * x,
        // 定積分 F(b) - F(a) の計算用。
        // x^2 - kx -> x^3/3 - kx^2/2
        integral: (a, b, params) => {
            const F = (x) => (x*x*x)/3 - (params.k*x*x)/2;
            return F(b) - F(a);
        },
        latexFunc: (p) => `x^2 - ${formatNum(p.k)}x`,
        latexPrim: (p) => `\\left[ \\frac{x^3}{3} - \\frac{${formatNum(p.k)}x^2}{2} \\right]`,
        label: (p) => `y = x^2 - ${formatNum(p.k)}x`,
        yRange: [-4, 6],
        hasK: true, hasR: false
    },
    'semicircle': {
        f: (x, params) => {
            let val = params.r*params.r - x*x;
            return val >= 0 ? Math.sqrt(val) : 0;
        },
        // 半円の面積: pi*r^2 / 2 (区間[-r, r]の場合)
        // 部分的な区間の場合は扇形+三角形で計算できるが、
        // 今回の要件「a=-r, b=r」がメインなので、一般形も対応しておく。
        integral: (a, b, params) => {
            // 不定積分: (1/2)(x sqrt(r^2-x^2) + r^2 arcsin(x/r))
            const r = params.r;
            const F = (x) => {
                // xが範囲外のときのガード
                if (x <= -r) return -0.25 * Math.PI * r * r; // 左端極限
                if (x >= r) return 0.25 * Math.PI * r * r;   // 右端極限
                return 0.5 * (x * Math.sqrt(r*r - x*x) + r*r * Math.asin(x/r));
            };
            return F(b) - F(a);
        },
        latexFunc: (p) => `\\sqrt{${formatNum(p.r)}^2 - x^2}`,
        latexPrim: (p) => `\\text{(幾何学的に計算)}`, // 長くなるので省略
        label: (p) => `y = \\sqrt{${formatNum(p.r)}^2 - x^2}`,
        yRange: [-1, 5],
        hasK: false, hasR: true
    },
    'sin': {
        f: (x, params) => Math.sin(x),
        integral: (a, b, params) => {
            const F = (x) => -Math.cos(x);
            return F(b) - F(a);
        },
        latexFunc: (p) => `\\sin x`,
        latexPrim: (p) => `\\left[ -\\cos x \\right]`,
        label: (p) => "y = sin(x)",
        yRange: [-1.5, 1.5],
        hasK: false, hasR: false
    },
    'exp': {
        f: (x, params) => Math.exp(x),
        integral: (a, b, params) => {
            const F = (x) => Math.exp(x);
            return F(b) - F(a);
        },
        latexFunc: (p) => `e^x`,
        latexPrim: (p) => `\\left[ e^x \\right]`,
        label: (p) => "y = e^x",
        yRange: [0, 10],
        hasK: false, hasR: false
    }
};

// UI要素
let funcSelect;
let inputA, inputB, inputN, inputK, inputR;
let sliderA, sliderB, sliderN, sliderK, sliderR;
let radios;
let resApprox, resExact, resError;
let integralMathDiv, sumMathDiv, deltaXInfo;
let groupK, groupR;
let piExplanation, valPiCalc;

// p5インスタンス
let sketchP5;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const PADDING = 40;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 要素取得
    funcSelect = document.getElementById('func-select');
    
    // Inputs & Sliders
    inputA = document.getElementById('input-a'); sliderA = document.getElementById('slider-a');
    inputB = document.getElementById('input-b'); sliderB = document.getElementById('slider-b');
    inputN = document.getElementById('input-n'); sliderN = document.getElementById('slider-n');
    inputK = document.getElementById('input-k'); sliderK = document.getElementById('slider-k');
    inputR = document.getElementById('input-r'); sliderR = document.getElementById('slider-r');
    
    radios = document.getElementsByName('method');
    resApprox = document.getElementById('res-approx');
    resExact = document.getElementById('res-exact');
    resError = document.getElementById('res-error');
    
    integralMathDiv = document.getElementById('integral-math');
    sumMathDiv = document.getElementById('sum-math');
    deltaXInfo = document.getElementById('delta-x-info');
    
    groupK = document.getElementById('group-k');
    groupR = document.getElementById('group-r');
    piExplanation = document.getElementById('pi-explanation');
    valPiCalc = document.getElementById('val-pi-calc');

    // イベントリスナー設定 (同期処理)
    setupSyncedInput(inputA, sliderA, 'a');
    setupSyncedInput(inputB, sliderB, 'b');
    setupSyncedInput(inputN, sliderN, 'n');
    setupSyncedInput(inputK, sliderK, 'k');
    setupSyncedInput(inputR, sliderR, 'r');

    funcSelect.addEventListener('change', onFuncChange);
    radios.forEach(r => r.addEventListener('change', updateState));

    // 初期化
    onFuncChange(); // 初期表示設定
    
    // p5.js 開始
    new p5(sketch, 'canvas-holder');
});

// スライダーと数値入力の同期
function setupSyncedInput(input, slider, key) {
    const update = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) return;
        state[key] = v;
        input.value = v;
        slider.value = v;
        updateState(); // 再計算
    };
    input.addEventListener('input', (e) => update(e.target.value));
    slider.addEventListener('input', (e) => update(e.target.value));
}

function onFuncChange() {
    state.funcId = funcSelect.value;
    const funcData = functions[state.funcId];

    // コントロール表示切替
    groupK.style.display = funcData.hasK ? 'flex' : 'none';
    groupR.style.display = funcData.hasR ? 'flex' : 'none';

    // デフォルト範囲の設定
    if (state.funcId === 'poly_k') {
        // a=0, b=k
        updateVal('a', 0);
        updateVal('b', state.k);
    } else if (state.funcId === 'semicircle') {
        // a=-r, b=r
        updateVal('a', -state.r);
        updateVal('b', state.r);
    } else if (state.funcId === 'sin') {
        updateVal('a', 0);
        updateVal('b', Math.PI); // πまで
    } else {
        updateVal('a', 0);
        updateVal('b', 2);
    }
    updateState();
}

// 値を更新してUIにも反映するヘルパー
function updateVal(key, val) {
    state[key] = val;
    // 小数点処理
    let displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
    
    if (key === 'a') { inputA.value = displayVal; sliderA.value = displayVal; }
    if (key === 'b') { inputB.value = displayVal; sliderB.value = displayVal; }
    if (key === 'k') { inputK.value = displayVal; sliderK.value = displayVal; }
    if (key === 'r') { inputR.value = displayVal; sliderR.value = displayVal; }
}

function updateState() {
    // ラジオボタンの状態取得
    radios.forEach(r => {
        if (r.checked) state.method = r.value;
    });

    calculateArea();
    updateMathJax();
}

function calculateArea() {
    const funcData = functions[state.funcId];
    const f = funcData.f;
    const a = state.a;
    const b = state.b;
    const n = state.n;
    const params = { k: state.k, r: state.r };
    const dx = (b - a) / n;

    // 厳密解
    state.exactArea = funcData.integral(a, b, params);

    // 近似解
    let sum = 0;
    for (let i = 0; i < n; i++) {
        let left = a + i * dx;
        let evalX;
        if (state.method === 'left') evalX = left;
        else if (state.method === 'right') evalX = left + dx;
        else evalX = left + dx / 2;
        
        sum += f(evalX, params) * dx;
    }
    state.approxArea = sum;

    // 結果表示
    resApprox.textContent = state.approxArea.toFixed(4);
    resExact.textContent = state.exactArea.toFixed(4);
    let error = Math.abs(state.approxArea - state.exactArea);
    resError.textContent = error.toFixed(4);
    
    if (error < 0.01) resError.style.color = "#2E7D32";
    else if (error < 0.1) resError.style.color = "#F57F17";
    else resError.style.color = "#C62828";

    // 円周率の説明表示
    if (state.funcId === 'semicircle') {
        piExplanation.style.display = 'block';
        // 近似値 * 2
        let piApprox = state.approxArea * 2 / (state.r * state.r); // 半径で正規化 (area = pi*r^2/2)
        valPiCalc.textContent = piApprox.toFixed(5);
    } else {
        piExplanation.style.display = 'none';
    }
}

function updateMathJax() {
    const funcData = functions[state.funcId];
    const params = { k: state.k, r: state.r };
    const aStr = formatNum(state.a);
    const bStr = formatNum(state.b);
    
    // 1. 定積分
    const latexFunc = funcData.latexFunc(params);
    const latexPrim = funcData.latexPrim(params);
    const ans = state.exactArea.toFixed(4);
    
    // シンプルに
    const integralStr = `
        \\int_{${aStr}}^{${bStr}} (${latexFunc}) dx 
        = ${ans}
    `;
    integralMathDiv.innerHTML = `$$ ${integralStr} $$`;

    // 2. 近似面積
    const n = state.n;
    const dx = (state.b - state.a) / n;
    
    // 底辺の長さ表示
    deltaXInfo.textContent = `底辺の長さ (幅) Δx = (${bStr} - ${aStr}) / ${n} = ${dx.toFixed(4)}`;

    // 和の式作成
    const maxItems = 5; // 表示上限
    let parts = [];
    
    for (let i = 0; i < Math.min(n, maxItems); i++) {
        let left = state.a + i * dx;
        let evalX;
        if (state.method === 'left') evalX = left;
        else if (state.method === 'right') evalX = left + dx;
        else evalX = left + dx/2;
        
        let h = funcData.f(evalX, params);
        // "高さ x 幅"
        parts.push(`(${h.toFixed(2)} \\times ${dx.toFixed(2)})`);
    }
    
    let sumStr = parts.join(' + ');
    if (n > maxItems) sumStr += ' + \\dots ';
    sumStr += ` = ${state.approxArea.toFixed(4)}`;
    
    sumMathDiv.innerHTML = `$$ \\text{Sum} \\approx ${sumStr} $$`;

    // MathJax
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([integralMathDiv, sumMathDiv]);
    }
}

// 数値フォーマットヘルパー (整数なら小数出さない)
function formatNum(num) {
    return Number.isInteger(num) ? num : num.toFixed(1);
}


// --- p5.js Sketch ---
const sketch = (p) => {
    p.setup = () => {
        let canvas = p.createCanvas(600, 400);
    };

    p.draw = () => {
        p.background(255);
        
        const funcData = functions[state.funcId];
        const params = { k: state.k, r: state.r };
        
        // 座標範囲
        let xMin = -5, xMax = 5;
        let yRange = funcData.yRange;
        
        // 関数ごとの範囲微調整
        if (state.funcId === 'poly_k') {
            // 頂点 y = -k^2/4
            let minY = -(state.k * state.k) / 4;
            yRange = [Math.min(-2, minY - 1), Math.max(5, minY + 10)];
        } else if (state.funcId === 'semicircle') {
            // アスペクト比を保つために範囲を調整したいが、
            // 簡易的に固定範囲で描画 (円が歪む可能性あり)
            // p5のscaleで調整する手もあるが、ここでは軸範囲で調整
            let r = state.r;
            xMin = -r - 1; xMax = r + 1;
            yRange = [-1, r + 1];
        } else if (state.funcId === 'exp') {
            // 指数関数は急激に増えるのでbに合わせて調整
            let maxVal = Math.exp(Math.max(state.a, state.b));
            yRange = [-1, Math.max(5, maxVal + 1)];
        }

        const yMin = yRange[0], yMax = yRange[1];
        
        const mapX = (x) => p.map(x, xMin, xMax, PADDING, p.width - PADDING);
        const mapY = (y) => p.map(y, yMin, yMax, p.height - PADDING, PADDING);

        // 軸
        drawAxes(p, mapX, mapY, xMin, xMax, yMin, yMax);

        // 関数
        p.noFill();
        p.stroke(0);
        p.strokeWeight(2);
        p.beginShape();
        // 描画刻み
        let step = (xMax - xMin) / 200;
        for (let x = xMin; x <= xMax; x += step) {
            let y = funcData.f(x, params);
            // 描画範囲外の値をクリップしないと線が暴れることがあるので注意
            // ただしp5はcanvas外を描画しないので基本OK
            p.vertex(mapX(x), mapY(y));
        }
        p.endShape();

        // 長方形
        drawRiemannRects(p, funcData.f, params, mapX, mapY);
        
        // 範囲ラベル
        drawLabels(p, mapX, mapY);
    };

    function drawAxes(p, mapX, mapY, xMin, xMax, yMin, yMax) {
        p.stroke(150); p.strokeWeight(1);
        
        let y0 = mapY(0);
        // 画面内制限
        if (y0 < 0) y0 = 0; if (y0 > p.height) y0 = p.height;
        p.line(0, y0, p.width, y0);
        
        let x0 = mapX(0);
        if (x0 < 0) x0 = 0; if (x0 > p.width) x0 = p.width;
        p.line(x0, 0, x0, p.height);
        
        // 目盛り
        p.fill(120); p.noStroke(); p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        
        // X目盛り
        let xStep = 1;
        if (xMax - xMin > 20) xStep = 5;
        for (let i = Math.ceil(xMin); i <= Math.floor(xMax); i+=xStep) {
            if (i === 0) continue;
            let x = mapX(i);
            p.text(i, x, y0 + 5);
            p.stroke(220); p.line(x, y0-3, x, y0+3); p.noStroke();
        }
        
        // Y目盛り
        p.textAlign(p.RIGHT, p.MIDDLE);
        let yStep = 1;
        if (yMax - yMin > 20) yStep = 5;
        for (let i = Math.ceil(yMin); i <= Math.floor(yMax); i+=yStep) {
            if (i === 0) continue;
            let y = mapY(i);
            p.text(i, x0 - 5, y);
            p.stroke(220); p.line(x0-3, y, x0+3, y); p.noStroke();
        }
    }

    function drawRiemannRects(p, f, params, mapX, mapY) {
        const a = state.a;
        const b = state.b;
        const n = state.n;
        const dx = (b - a) / n;
        
        p.stroke(0, 100, 200);
        p.strokeWeight(1);
        p.fill(30, 136, 229, 100);

        for (let i = 0; i < n; i++) {
            let leftX = a + i * dx;
            let rightX = leftX + dx;
            let evalX;
            
            if (state.method === 'left') evalX = leftX;
            else if (state.method === 'right') evalX = rightX;
            else evalX = leftX + dx / 2;
            
            let h = f(evalX, params);
            
            // 描画
            let x1 = mapX(leftX);
            let x2 = mapX(rightX);
            let yBase = mapY(0);
            let yTop = mapY(h);
            
            p.quad(x1, yBase, x2, yBase, x2, yTop, x1, yTop);
            
            // 点
            p.push();
            p.fill(255, 0, 0); p.noStroke();
            p.circle(mapX(evalX), yTop, 4);
            p.pop();
        }
    }

    function drawLabels(p, mapX, mapY) {
        p.noStroke(); p.fill(0);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.textSize(14); p.textStyle(p.BOLD);
        
        let ax = mapX(state.a);
        let bx = mapX(state.b);
        let yPos = mapY(0) + 25;
        if (yPos > p.height) yPos = p.height - 5;

        p.text("a", ax, yPos);
        p.text("b", bx, yPos);
    }
};