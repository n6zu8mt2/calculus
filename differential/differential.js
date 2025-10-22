// --- グローバル設定 ---
const functionDefs = {
    'const_accel': {
        label: 'x(t) = ½at² + v₀t + x₀ (等加速度運動)',
        getFunctions: (p) => ({
            func: (t) => 0.5 * p.a * t*t + p.v0 * t + p.x0,
            deriv: (t) => p.a * t + p.v0,
            params: p
        }),
        tRange: { min: 0, max: 10 },
        xRange: { min: -10, max: 100 },
        explanation: (p) => `
            <h3>選択中のモデル: $x(t) = \\frac{1}{2}at^2 + v_0t + x_0$</h3>
            <p>パラメータ: $a = ${p.a}$, $v_0 = ${p.v0}$, $x_0 = ${p.x0}$</p>
            <p>瞬間の速度 $v(t)$ は $v(t) = at + v_0$。</p>
            <p>等加速度運動の典型例です。</p>`
    },
    'shm': {
        label: 'x(t) = A sin(ωt + φ₀) + x₀ (単振動)',
        getFunctions: (p) => ({
            func: (t) => p.A * Math.sin(p.w * t + p.phi) + p.x0,
            deriv: (t) => p.A * p.w * Math.cos(p.w * t + p.phi),
            params: p 
        }),
        tRange: { min: 0, max: 10 },
        xRange: { min: -50, max: 50 },
        explanation: (p) => `
            <h3>選択中のモデル: $x(t) = A \\sin(\\omega t + \\phi_0) + x_0$</h3>
            <p>パラメータ: $A=${p.A}$, $\\omega=${p.w}$, $\\phi_0=${p.phi}$, $x_0=${p.x0}$</p>
            <p>速度は $v(t) = A\\omega\\cos(\\omega t + \\phi_0)$。</p>`
    }
};

let graphP5, animP5;
let animationInterval = null;
let isPlaying = false;
let isCalculatingDelta = false;

// DOM要素
let timeSlider, dtSlider, funcSelector, playPauseButton, calculateDeltaButton;
let timeValueSpan, dtValueSpan, avgVelocitySpan, instVelocitySpan, deltaXSpan, avgVelocityBox, dtDisplay;
let explanationDiv;

document.addEventListener('DOMContentLoaded', () => {
    timeSlider = document.getElementById('timeSlider');
    dtSlider = document.getElementById('dtSlider');
    funcSelector = document.getElementById('functionSelector');
    playPauseButton = document.getElementById('playPauseButton');
    calculateDeltaButton = document.getElementById('calculateDeltaButton');
    timeValueSpan = document.getElementById('timeValue');
    dtValueSpan = document.getElementById('dtValue');
    avgVelocitySpan = document.getElementById('avgVelocity');
    instVelocitySpan = document.getElementById('instVelocity');
    deltaXSpan = document.getElementById('deltaX');
    avgVelocityBox = document.getElementById('avgVelocityBox');
    dtDisplay = document.getElementById('dtDisplay');
    explanationDiv = document.getElementById('explanation-details');

    graphP5 = new p5(sketchGraph);
    animP5 = new p5(sketchAnimation);

    setupEventListeners();
    updateParameterUI();
    updateAll();

    setTimeout(() => {
        graphP5?.redraw();
        animP5?.redraw();
    }, 200);
});

function setupEventListeners() {
    playPauseButton.addEventListener('click', togglePlayback);
    calculateDeltaButton.addEventListener('click', toggleDeltaCalculation);
    funcSelector.addEventListener('change', () => { updateParameterUI(); updateAll(); });
    document.querySelectorAll('#param-inputs input[type="number"]').forEach(i => i.addEventListener('input', updateAll));
    timeSlider.addEventListener('input', updateAll);
    dtSlider.addEventListener('input', updateAll);
}

function togglePlayback() {
    if (isPlaying) {
        clearInterval(animationInterval);
        playPauseButton.textContent = '再生';
        playPauseButton.classList.remove('playing');
        animP5.noLoop();
        isPlaying = false;
    } else {
        playPauseButton.textContent = '一時停止';
        playPauseButton.classList.add('playing');
        animP5.loop();
        isPlaying = true;
        animationInterval = setInterval(() => {
            let t = parseFloat(timeSlider.value);
            const step = parseFloat(timeSlider.step);
            const maxT = parseFloat(timeSlider.max);
            t += step * 2;
            if (t > maxT) t = 0;
            timeSlider.value = t;
            updateAll();
        }, 30);
    }
}

function toggleDeltaCalculation() {
    isCalculatingDelta = !isCalculatingDelta;
    document.querySelector('.dt-control').classList.toggle('hidden', !isCalculatingDelta);
    avgVelocityBox.classList.toggle('hidden', !isCalculatingDelta);
    calculateDeltaButton.textContent = isCalculatingDelta ? '平均の速度の計算を隠す' : '平均の速度を計算する';
    calculateDeltaButton.classList.toggle('active', isCalculatingDelta);
    updateAll();
}

function updateParameterUI() {
    const current = funcSelector.value;
    document.querySelectorAll('.param-group').forEach(g => g.classList.toggle('hidden', !g.id.startsWith(current)));
}

function getParamsFromUI() {
    const key = funcSelector.value;
    if (key === 'const_accel') {
        return {
            a: parseFloat(document.getElementById('a_a').value),
            v0: parseFloat(document.getElementById('a_v0').value),
            x0: parseFloat(document.getElementById('a_x0').value)
        };
    } else {
        return {
            A: parseFloat(document.getElementById('shm_A').value),
            w: parseFloat(document.getElementById('shm_w').value),
            phi: parseFloat(document.getElementById('shm_phi').value),
            x0: parseFloat(document.getElementById('shm_x0').value)
        };
    }
}

function updateAll() {
    const params = getParamsFromUI();
    const modelKey = funcSelector.value;
    const def = functionDefs[modelKey];
    const { func, deriv } = def.getFunctions(params);
    const tRange = def.tRange;
    const xRange = def.xRange;
    const t = parseFloat(timeSlider.value);
    const dt = parseFloat(dtSlider.value);

    graphP5.updateData(func, deriv, tRange, xRange, t, dt, isCalculatingDelta);
    animP5.updateData(func, xRange, t, dt, isCalculatingDelta, modelKey);

    timeValueSpan.innerHTML = `t = ${t.toFixed(2)}`;
    dtValueSpan.innerHTML = `Δt = ${dt.toFixed(2)}`;
    instVelocitySpan.innerHTML = deriv(t).toFixed(2);

    if (isCalculatingDelta) {
        const x1 = func(t), x2 = func(t + dt);
        const deltaX = x2 - x1, avgVelocity = deltaX / dt;
        dtDisplay.textContent = dt.toFixed(2);
        deltaXSpan.textContent = deltaX.toFixed(2);
        avgVelocitySpan.textContent = avgVelocity.toFixed(2);
    }

    explanationDiv.innerHTML = def.explanation(params);
    if (window.MathJax?.typesetPromise) MathJax.typesetPromise([explanationDiv]);
}

// ----------------------------
// グラフスケッチ（目盛付き）
// ----------------------------
const sketchGraph = (p) => {
    let func, deriv, tRange, xRange, t, dt, showDelta;
    const pad = 50, W = 600, H = 400;

    const tToX = t => p.map(t, tRange.min, tRange.max, pad, W - pad);
    const xToY = x => p.map(x, xRange.min, xRange.max, H - pad, pad);

    p.updateData = (f, d, tr, xr, _t, _dt, sd) => {
        func = f; deriv = d; tRange = tr; xRange = xr; t = _t; dt = _dt; showDelta = sd;
        p.redraw();
    };

    p.setup = () => {
        p.createCanvas(W, H).parent('graph-holder');
        p.noLoop();
    };

    p.draw = () => {
        if (!func) return;
        p.background(255);
        drawAxes();

        // 関数曲線
        p.noFill(); p.stroke(0); p.strokeWeight(2);
        p.beginShape();
        for (let ti = tRange.min; ti <= tRange.max; ti += 0.05)
            p.vertex(tToX(ti), xToY(func(ti)));
        p.endShape();

        // 接線
        const x1 = func(t);
        const v = deriv(t);
        p.stroke(30,136,229); p.strokeWeight(2);
        const xs = v*(tRange.min - t) + x1, xe = v*(tRange.max - t) + x1;
        p.line(tToX(tRange.min), xToY(xs), tToX(tRange.max), xToY(xe));

        // 平均速度線
        if (showDelta) {
            const t2 = t + dt, x2 = func(t2);
            p.stroke(229,57,53); p.line(tToX(t),xToY(x1),tToX(t2),xToY(x2));
            p.fill(229,57,53); p.ellipse(tToX(t2),xToY(x2),8,8);
        }

        p.fill(30,136,229); p.ellipse(tToX(t),xToY(x1),12,12);
    };

    function drawAxes() {
        p.stroke(150); p.strokeWeight(1);
        const y0 = xToY(0), x0 = tToX(0);
        p.line(pad, y0, W - pad, y0);
        p.line(x0, H - pad, x0, pad);

        // 目盛
        p.fill(0); p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        for (let i = tRange.min; i <= tRange.max; i++) {
            const x = tToX(i);
            p.text(i.toFixed(0), x, y0 + 5);
            p.stroke(230); p.line(x, pad, x, H - pad);
        }

        p.textAlign(p.RIGHT, p.CENTER);
        for (let x = xRange.min; x <= xRange.max; x += 10) {
            const y = xToY(x);
            p.text(x.toFixed(0), pad - 5, y);
            p.stroke(230); p.line(pad, y, W - pad, y);
        }

        p.fill(0); p.textAlign(p.RIGHT, p.CENTER);
        p.text("位置 x", pad - 10, pad);
        p.textAlign(p.CENTER, p.TOP);
        p.text("時間 t", W - pad, y0 + 10);
    }
};

// -----------------------------
// アニメーションスケッチ
// -----------------------------
const sketchAnimation = (p) => {
    let func, xRange, t, dt, showDelta, modelKey;
    const pad = 50;

    p.updateData = (f, xr, _t, _dt, sd, key) => {
        func = f; xRange = xr; t = _t; dt = _dt; showDelta = sd; modelKey = key;
        p.redraw();
    };

    p.setup = () => {
        p.createCanvas(600, 100).parent('animation-holder');
        p.noLoop();
    };

    p.draw = () => {
        if (!func) return;
        p.background(255);
        const yc = p.height / 2 + 10;
        const xToP = x => p.map(x, xRange.min, xRange.max, pad, p.width - pad);

        // 軸と目盛り
        p.stroke(150); p.line(pad, yc, p.width - pad, yc);
        p.fill(0); p.textAlign(p.LEFT, p.BOTTOM);
        p.text("位置 x", pad, yc - 25);
        for (let i = xRange.min; i <= xRange.max; i += 10) {
            const px = xToP(i);
            p.stroke(200); p.line(px, yc - 5, px, yc + 5);
            p.noStroke(); p.textAlign(p.CENTER, p.TOP);
            p.text(i.toFixed(0), px, yc + 8);
        }

        const x0 = func(0);
        const x1 = func(t);
        const x1map = xToP(x1);
        const x0map = xToP(x0);

        // バネ：自然長 = t=0 の位置
        if (modelKey === 'shm') drawSpring(p, pad, x0map, x1map, yc);

        p.fill(30,136,229); p.ellipse(x1map, yc, 20, 20);
        p.fill(0); p.textAlign(p.CENTER, p.BOTTOM);
        p.text("x(t)", x1map, yc - 15);

        if (showDelta) {
            const x2map = xToP(func(t + dt));
            p.fill(229,57,53,150); p.ellipse(x2map, yc, 18, 18);
            p.textAlign(p.CENTER, p.TOP);
            p.text("x(t+Δt)", x2map, yc + 25);
        }
    };

    // 🔧 修正版バネ描画：全体が伸び縮みする
    function drawSpring(p, x_left, x_nat, x_ball, y) {
        p.stroke(0); p.strokeWeight(3);
        p.line(x_left, y - 20, x_left, y + 20);

        const coils = 10;
        const amp = 20;
        const len = x_ball - x_left; // 現在の長さ
        const naturalLen = x_nat - x_left;
        const stretchRatio = len / naturalLen;

        p.stroke(100); p.strokeWeight(1); p.noFill();
        p.beginShape();
        p.vertex(x_left, y);
        for (let i = 1; i <= coils; i++) {
            const x = x_left + (len / coils) * i;
            const offset = (i % 2 === 0 ? -amp/2 : amp/2) * stretchRatio;
            p.vertex(x, y + offset);
        }
        p.vertex(x_ball, y);
        p.endShape();
    }
};
