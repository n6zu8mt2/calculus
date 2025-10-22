// --- グローバル設定: 関数ライブラリ ---
const functionDefs = {
    'const_accel': {
        label: 'x(t) = ½at² + v₀t + x₀ (等加速度運動)',
        getFunctions: (p) => ({
            func: (t) => 0.5 * p.a * t*t + p.v0 * t + p.x0,
            deriv: (t) => p.a * t + p.v0, // v(t) = at + v₀
            params: p
        }),
        tRange: { min: 0, max: 10 },
        explanation: (p) => `
            <h3>選択中のモデル: $x(t) = \\frac{1}{2}at^2 + v_0t + x_0$</h3>
            <p>パラメータ: $a = ${p.a}$, $v_0 = ${p.v0}$, $x_0 = ${p.x0}$</p>
            <p>瞬間の速度 $v(t)$ (青い接線の傾き)は、 $x(t)$ を $t$ で微分することで求められます。<br>
            $v(t) = \\frac{d}{dt}x(t) = at + v_0$</p>
            <p>時刻 $t$ に比例して速度が変化する（加速/減速する）運動です。</p>`
    },
    'shm': {
        label: 'x(t) = A sin(ωt + φ₀) + x₀ (単振動)',
        // ▼ 平衡点 x0 を追加 ▼
        getFunctions: (p) => ({
            func: (t) => p.A * Math.sin(p.w * t + p.phi) + p.x0,
            deriv: (t) => p.A * p.w * Math.cos(p.w * t + p.phi), // v(t) = Aω cos(ωt + φ₀)
            params: p // ▼ バネ描画用にパラメータを渡す ▼
        }),
        tRange: { min: 0, max: 10 },
        explanation: (p) => `
            <h3>選択中のモデル: $x(t) = A \\sin(\\omega t + \\phi_0) + x_0$</h3>
            <p>パラメータ: 振幅 $A = ${p.A}$, 角速度 $\\omega = ${p.w}$, 初期位相 $\\phi_0 = ${p.phi}$, 平衡点 $x_0 = ${p.x0}$</p>
            <p>瞬間の速度 $v(t)$ は、$x(t)$ を $t$ で微分します。（合成関数の微分）<br>
            $v(t) = \\frac{d}{dt}x(t) = A \\cdot \\omega \\cos(\\omega t + \\phi_0)$</p>
            <p>位置 $x$ が平衡点 $x_0$ を中心に $\\sin$ で、速度 $v$ が $\\cos$ で変化する振動運動です。</p>`
    }
};

// --- グローバル変数 ---
let graphP5, animP5;
let animationInterval = null;
let isPlaying = false;
let isCalculatingDelta = false; 

// DOM要素
let timeSlider, dtSlider, funcSelector, playPauseButton, calculateDeltaButton;
let timeValueSpan, dtValueSpan, avgVelocitySpan, instVelocitySpan, deltaXSpan, avgVelocityBox, dtDisplay;
let explanationDiv;

// --- DOM読み込み完了時に初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素を一度に取得
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
    dtDisplay = document.getElementById('dtDisplay'); // ▼ Δt表示用
    explanationDiv = document.getElementById('explanation-details');

    graphP5 = new p5(sketchGraph);
    animP5 = new p5(sketchAnimation);

    setupEventListeners();
    updateParameterUI();
    updateAll();
});

// --- イベントリスナー設定 ---
function setupEventListeners() {
    playPauseButton.addEventListener('click', togglePlayback);
    calculateDeltaButton.addEventListener('click', toggleDeltaCalculation); 
    funcSelector.addEventListener('change', () => {
        updateParameterUI();
        updateAll();
    });
    const paramInputs = document.querySelectorAll('#param-inputs input[type="number"]');
    paramInputs.forEach(input => {
        input.addEventListener('input', updateAll);
    });
    timeSlider.addEventListener('input', updateAll);
    dtSlider.addEventListener('input', updateAll);
}

// --- 再生/一時停止 ---
function togglePlayback() {
    if (isPlaying) {
        clearInterval(animationInterval);
        playPauseButton.textContent = '再生';
        playPauseButton.classList.remove('playing');
        isPlaying = false;
    } else {
        playPauseButton.textContent = '一時停止';
        playPauseButton.classList.add('playing');
        isPlaying = true;
        animationInterval = setInterval(() => {
            let t = parseFloat(timeSlider.value);
            let maxT = parseFloat(timeSlider.max);
            let minT = parseFloat(timeSlider.min);
            let step = parseFloat(timeSlider.step);
            t += step * 2;
            if (t > maxT) t = minT;
            timeSlider.value = t;
            updateAll();
        }, 16);
    }
}

// --- Δt計算の表示/非表示トグル ---
function toggleDeltaCalculation() {
    isCalculatingDelta = !isCalculatingDelta;
    if (isCalculatingDelta) {
        calculateDeltaButton.textContent = '平均の速度の計算を隠す';
        calculateDeltaButton.classList.add('active');
        document.querySelector('.dt-control').classList.remove('hidden');
        avgVelocityBox.classList.remove('hidden');
    } else {
        calculateDeltaButton.textContent = '平均の速度を計算する';
        calculateDeltaButton.classList.remove('active');
        document.querySelector('.dt-control').classList.add('hidden');
        avgVelocityBox.classList.add('hidden');
    }
    updateAll();
}

// --- UI更新: パラメータ欄の表示切替 ---
function updateParameterUI() {
    const currentFuncKey = funcSelector.value;
    document.querySelectorAll('.param-group').forEach(group => {
        if (group.id === `${currentFuncKey}-params`) {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    });
}

// --- UI更新: スライダーからパラメータを取得 ---
function getParamsFromUI() {
    const key = funcSelector.value;
    let p = {};
    if (key === 'const_accel') {
        p.a = parseFloat(document.getElementById('a_a').value) || 0;
        p.v0 = parseFloat(document.getElementById('a_v0').value) || 0;
        p.x0 = parseFloat(document.getElementById('a_x0').value) || 0;
    } else if (key === 'shm') {
        p.A = parseFloat(document.getElementById('shm_A').value) || 0;
        p.w = parseFloat(document.getElementById('shm_w').value) || 0;
        p.phi = parseFloat(document.getElementById('shm_phi').value) || 0;
        p.x0 = parseFloat(document.getElementById('shm_x0').value) || 0; // ▼ 平衡点
    }
    return p;
}

// --- UI更新: すべての表示を更新 ---
function updateAll() {
    const params = getParamsFromUI();
    const def = functionDefs[funcSelector.value];
    const { func, deriv, params: funcParams } = def.getFunctions(params); // ▼ paramsも取得
    const tRange = def.tRange;
    
    // ▼▼▼ スケールを固定 ▼▼▼
    const xRange = { min: -50, max: 50 }; 
    // ▲▲▲ スケールを固定 ▲▲▲

    const t = parseFloat(timeSlider.value);
    const dt = parseFloat(dtSlider.value);

    // p5に渡すデータを変更 (funcParamsを追加)
    graphP5.updateData(func, deriv, tRange, xRange, t, dt, isCalculatingDelta);
    animP5.updateData(func, xRange, t, dt, isCalculatingDelta, funcParams, funcSelector.value);
    
    timeValueSpan.innerHTML = `t = ${t.toFixed(2)}`;
    dtValueSpan.innerHTML = `Δt = ${dt.toFixed(2)}`;

    // 瞬間の速度
    const instVelocity = deriv(t);
    instVelocitySpan.innerHTML = instVelocity.toFixed(2);

    if (isCalculatingDelta) {
        // ▼ dtDisplayも更新 ▼
        dtDisplay.innerHTML = dt.toFixed(2);
        const x1 = func(t);
        const x2 = func(t + dt);
        const deltaX = x2 - x1;
        const avgVelocity = deltaX / dt;

        deltaXSpan.innerHTML = deltaX.toFixed(2);
        avgVelocitySpan.innerHTML = avgVelocity.toFixed(2);
    }

    // 解説
    explanationDiv.innerHTML = def.explanation(params);
    if (window.MathJax) {
        MathJax.typesetPromise([explanationDiv]);
    }
}


// --- スケッチ1: x-tグラフの描画 ---
const sketchGraph = (p) => {
    let func, deriv, tRange, xRange, t, dt, showDelta;
    let padding = 50, canvasWidth = 600, canvasHeight = 400;

    const tToX = (t_val) => p.map(t_val, tRange.min, tRange.max, padding, canvasWidth - padding);
    const xToY = (x_val) => p.map(x_val, xRange.min, xRange.max, canvasHeight - padding, padding);

    p.updateData = (_func, _deriv, _tRange, _xRange, _t, _dt, _showDelta) => {
        func = _func; deriv = _deriv; tRange = _tRange; xRange = _xRange; t = _t; dt = _dt;
        showDelta = _showDelta; 
        p.redraw();
    };

    p.setup = () => {
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('graph-holder');
        p.noLoop();
    };

    p.draw = () => {
        if (!func) return; 
        p.background(255);
        drawAxes(); // ▼ 目盛り付きの軸を描画

        p.noFill(); p.stroke(0); p.strokeWeight(2);
        p.beginShape();
        for (let t_i = tRange.min; t_i <= tRange.max; t_i += (tRange.max - tRange.min) / 200) {
            p.vertex(tToX(t_i), xToY(func(t_i)));
        }
        p.endShape();
        
        let x1 = func(t);
        let instVelocity = deriv(t);
        let t_start = tRange.min, t_end = tRange.max;
        let x_start = instVelocity * (t_start - t) + x1;
        let x_end = instVelocity * (t_end - t) + x1;
        p.stroke(30, 136, 229); p.strokeWeight(2); // 青
        p.line(tToX(t_start), xToY(x_start), tToX(t_end), xToY(x_end));
        p.fill(30, 136, 229);
        p.ellipse(tToX(t), xToY(x1), 12, 12);

        if (showDelta) {
            let t2 = t + dt;
            let x2 = func(t2);
            p.stroke(229, 57, 53); p.strokeWeight(2); // 赤
            p.line(tToX(t), xToY(x1), tToX(t2), xToY(x2));
            p.fill(229, 57, 53);
            p.ellipse(tToX(t), xToY(x1), 8, 8);
            p.ellipse(tToX(t2), xToY(x2), 8, 8);
        }
    };

    // ▼▼▼ 目盛り描画を追加 ▼▼▼
    const drawAxes = () => {
        p.stroke(150); p.strokeWeight(1);
        let y_zero = xToY(0);
        let x_zero = tToX(0);

        // 軸
        p.line(padding, y_zero, canvasWidth - padding, y_zero); // t軸
        p.line(x_zero, canvasHeight - padding, x_zero, padding); // x軸

        p.fill(0); p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.text("位置 x", padding - 10, padding);
        p.textAlign(p.CENTER, p.TOP);
        p.text("時間 t", canvasWidth - padding, y_zero + 10);

        // t軸の目盛り
        p.textAlign(p.CENTER, p.TOP);
        for (let t_i = tRange.min; t_i <= tRange.max; t_i += 1) {
            if (t_i === 0) continue;
            let tx = tToX(t_i);
            p.text(t_i, tx, y_zero + 5);
            p.stroke(220); p.line(tx, padding, tx, canvasHeight - padding);
        }

        // x軸の目盛り
        p.textAlign(p.RIGHT, p.CENTER);
        for (let x_i = xRange.min; x_i <= xRange.max; x_i += 10) {
            if (x_i === 0) continue;
            let yx = xToY(x_i);
            p.text(x_i.toFixed(0), padding - 5, yx);
            p.stroke(220); p.line(padding, yx, canvasWidth - padding, yx);
        }
    };
};

// --- スケッチ2: 1D運動アニメーション ---
const sketchAnimation = (p) => {
    let func, xRange, t, dt, showDelta, funcParams, modelKey;
    let padding = 50; // 目盛りのためパディングを増やす

    p.updateData = (_func, _xRange, _t, _dt, _showDelta, _params, _modelKey) => {
        func = _func; xRange = _xRange; t = _t; dt = _dt; showDelta = _showDelta;
        funcParams = _params; modelKey = _modelKey; // ▼ バネ用にパラメータとモデル名を受け取る
        p.redraw();
    };

    p.setup = () => {
        let canvas = p.createCanvas(600, 100); // 高さを増やす
        canvas.parent('animation-holder');
        p.noLoop();
    };

    p.draw = () => {
        if (!func) return;
        p.background(255);
        let y_center = p.height / 2;

        const xToP = (x_val) => p.map(x_val, xRange.min, xRange.max, padding, p.width - padding);
        
        // ▼▼▼ 軸と目盛りを描画 ▼▼▼
        p.stroke(150); p.strokeWeight(2);
        p.line(padding, y_center, p.width - padding, y_center); // 数直線
        p.fill(0); p.noStroke();
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text("位置 x", padding, y_center - 25); // ラベル

        p.textAlign(p.CENTER, p.TOP);
        for (let x_i = xRange.min; x_i <= xRange.max; x_i += 10) {
            let x_mapped = xToP(x_i);
            p.text(x_i.toFixed(0), x_mapped, y_center + 5);
            p.stroke(150); p.strokeWeight(1);
            p.line(x_mapped, y_center - 5, x_mapped, y_center + 5);
        }
        // ▲▲▲ 目盛り描画ここまで ▲▲▲

        // ▼ バネの描画 (showDeltaがtrue) ▼
        if (modelKey === 'shm') {
            let x0_mapped = xToP(funcParams.x0);
            drawSpring(p, x0_mapped, y_center); // 壁
        }

        // x(t) の点 (青)
        let x1 = func(t);
        let x1_mapped = xToP(x1);
        
        // ▼ バネの描画 (物体) ▼
        if (modelKey === 'shm') {
            let x0_mapped = xToP(funcParams.x0);
            drawSpring(p, x0_mapped, x1_mapped, y_center);
        }

        p.fill(30, 136, 229); p.noStroke(); // 青
        p.ellipse(x1_mapped, y_center, 20, 20);
        p.fill(0); p.textAlign(p.CENTER, p.BOTTOM);
        p.text(`x(t)`, x1_mapped, y_center - 15);

        // x(t+Δt) の点 (赤) - showDeltaがtrueの場合のみ
        if (showDelta) {
            let x2 = func(t + dt);
            let x2_mapped = xToP(x2);
            p.fill(229, 57, 53, 150); // 赤 (半透明)
            p.noStroke();
            p.ellipse(x2_mapped, y_center, 18, 18);
            p.fill(0); p.textAlign(p.CENTER, p.TOP);
            p.text(`x(t+Δt)`, x2_mapped, y_center + 25); // ラベルを下に
        }
    };
    
    // ▼▼▼ バネ描画のヘルパー関数 ▼▼▼
    function drawSpring(p, x_origin, x_ball, y, coils = 10, width = 20) {
        if (x_origin === x_ball) return;
        
        p.stroke(100); p.strokeWeight(1); p.noFill();
        p.beginShape();
        p.vertex(x_origin, y); // 壁
        let dx = x_ball - x_origin;
        let coilLength = dx / (coils + 1);
        
        for (let i = 1; i <= coils; i++) {
            let x = x_origin + coilLength * i;
            let y_offset = (i % 2 === 0) ? -width/2 : width/2;
            p.vertex(x - coilLength/2, y + y_offset);
        }
        p.vertex(x_ball, y); // ボール
        p.endShape();
        
        // 壁の描画 (x_originが端でない場合)
        if (x_origin > p.width - padding - 5 || x_origin < padding + 5) {
             // 端なら描画しない
        } else {
            p.stroke(0); p.strokeWeight(3);
            p.line(x_origin, y - width, x_origin, y + width);
        }
    }
};