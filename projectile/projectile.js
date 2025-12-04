/**
 * 斜方投射シミュレーター
 */

// シミュレーションパラメータ（共有オブジェクト）
const simParams = {
    v0: 20,        // 初速 (m/s)
    theta: 45,     // 角度 (度)
    g: 9.8,        // 重力加速度
    v0x: 0,        // 初速x成分
    v0y: 0,        // 初速y成分
    
    // 計算結果
    tPeak: 0,      // 最高点到達時刻
    hMax: 0,       // 最高点
    tLand: 0,      // 着地時刻
    xMax: 0,       // 飛距離

    // スケール固定用（初速v0における最大到達可能範囲）
    maxPossibleX: 0, // θ=45°のときの飛距離 (v0^2 / g)
    maxPossibleY: 0, // θ=90°のときの高さ (v0^2 / 2g)
    maxPossibleT: 0, // θ=90°のときの滞空時間 (2*v0 / g)
    
    // 状態
    currentTime: 0, // 現在の表示時間 t
    isPlaying: false,
    unit: 'ms'
};

// DOM要素
let v0Input, unitSelect, thetaSlider, thetaInput;
let dynamicEquationsDiv;
let timeSlider, timeDisplay, playBtn, resetBtn;
let statTPeak, statHMax, statTLand, statXMax;

// p5インスタンス
let p5Trajectory, p5Velocity, p5Position;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 要素取得
    v0Input = document.getElementById('v0-input');
    unitSelect = document.getElementById('unit-select');
    thetaSlider = document.getElementById('theta-slider');
    thetaInput = document.getElementById('theta-input');
    dynamicEquationsDiv = document.getElementById('dynamic-equations');
    
    timeSlider = document.getElementById('time-slider');
    timeDisplay = document.getElementById('current-time-display');
    playBtn = document.getElementById('anim-play-btn');
    resetBtn = document.getElementById('anim-reset-btn');

    statTPeak = document.getElementById('stat-t-peak');
    statHMax = document.getElementById('stat-h-max');
    statTLand = document.getElementById('stat-t-land');
    statXMax = document.getElementById('stat-x-max');

    // イベントリスナー設定
    v0Input.addEventListener('input', updateParams);
    unitSelect.addEventListener('change', updateParams);
    
    // 角度スライダー同期
    thetaSlider.addEventListener('input', () => {
        thetaInput.value = thetaSlider.value;
        updateParams();
    });
    thetaInput.addEventListener('input', () => {
        let val = parseFloat(thetaInput.value);
        if (val > 90) val = 90; if (val < 0) val = 0;
        thetaSlider.value = val;
        updateParams();
    });

    // 時間スライダー
    timeSlider.addEventListener('input', () => {
        simParams.currentTime = parseFloat(timeSlider.value);
        simParams.isPlaying = false;
        playBtn.textContent = "再生";
        updateTimeDisplay();
    });

    // 再生ボタン
    playBtn.addEventListener('click', () => {
        simParams.isPlaying = !simParams.isPlaying;
        playBtn.textContent = simParams.isPlaying ? "一時停止" : "再生";
    });

    // リセットボタン
    resetBtn.addEventListener('click', () => {
        simParams.currentTime = 0;
        simParams.isPlaying = false;
        playBtn.textContent = "再生";
        timeSlider.value = 0;
        updateTimeDisplay();
    });

    // 初回計算
    updateParams();

    // p5.js スケッチの開始
    p5Trajectory = new p5(sketchTrajectory, 'trajectory-canvas-holder');
    p5Velocity = new p5(sketchVelocity, 'velocity-canvas-holder');
    p5Position = new p5(sketchPosition, 'position-canvas-holder');
});


// --- パラメータ更新と計算 ---
function updateParams() {
    let rawV0 = parseFloat(v0Input.value) || 0;
    let unit = unitSelect.value;
    simParams.unit = unit;
    simParams.theta = parseFloat(thetaInput.value) || 0;

    // 内部計算は常に m/s
    if (unit === 'kmh') {
        simParams.v0 = rawV0 * 1000 / 3600;
    } else {
        simParams.v0 = rawV0;
    }

    const rad = simParams.theta * Math.PI / 180;
    simParams.v0x = simParams.v0 * Math.cos(rad);
    simParams.v0y = simParams.v0 * Math.sin(rad);

    // --- 物理量の計算 ---
    simParams.tPeak = simParams.v0y / simParams.g;
    simParams.hMax = (simParams.v0y * simParams.v0y) / (2 * simParams.g);

    // 着地時刻
    if (simParams.v0y <= 0.001 && simParams.theta <= 0) {
        simParams.tLand = 0;
    } else {
        simParams.tLand = 2 * simParams.v0y / simParams.g;
    }

    // 飛距離
    simParams.xMax = simParams.v0x * simParams.tLand;

    // --- スケール固定用の最大範囲計算 (v0のみに依存) ---
    // 最大到達高度 (theta=90のとき)
    simParams.maxPossibleY = (simParams.v0 * simParams.v0) / (2 * simParams.g);
    // 最大到達距離 (theta=45のとき)
    simParams.maxPossibleX = (simParams.v0 * simParams.v0) / simParams.g;
    // 最大滞空時間 (theta=90のとき)
    simParams.maxPossibleT = (2 * simParams.v0) / simParams.g;
    
    // v0=0や極小の時の安全策
    if (simParams.maxPossibleX < 1) simParams.maxPossibleX = 10;
    if (simParams.maxPossibleY < 1) simParams.maxPossibleY = 10;
    if (simParams.maxPossibleT < 1) simParams.maxPossibleT = 1;


    // スライダー範囲の更新 (現在の運動の着地時間に基づくが、比較のため最大滞空時間を考慮)
    // ここでは「現在の設定での運動」が見やすいように調整しつつ、最大値もカバーできるようにする
    // 比較しやすくするため、スライダーの最大値は「最大滞空時間」に固定するのが理想だが、
    // 角度が浅いと操作しづらくなるため、ここでは「現在の着地時間 x 1.2」とする（従来通り）
    // ただし、グラフ描画側のスケールは maxPossibleT を使う。
    const sliderMax = Math.max(1.0, simParams.tLand * 1.2);
    timeSlider.max = sliderMax;
    timeSlider.step = sliderMax / 500; 
    
    if (simParams.currentTime > sliderMax) {
        simParams.currentTime = 0;
        timeSlider.value = 0;
    }

    // 表示更新
    updateStatsDisplay();
    updateEquationDisplay();
    updateTimeDisplay();
}

function updateStatsDisplay() {
    statTPeak.textContent = simParams.tPeak.toFixed(2) + " s";
    statHMax.textContent = simParams.hMax.toFixed(2) + " m";
    statTLand.textContent = simParams.tLand.toFixed(2) + " s";
    statXMax.textContent = simParams.xMax.toFixed(2) + " m";
}

function updateEquationDisplay() {
    const v0x_str = simParams.v0x.toFixed(2);
    const v0y_str = simParams.v0y.toFixed(2);
    const g_str = simParams.g;
    const half_g_str = (simParams.g / 2).toFixed(2);

    const latex = `
        \\begin{align}
        x'(t) &= ${v0x_str} \\\\
        y'(t) &= ${v0y_str} - ${g_str}t \\\\
        x(t) &= ${v0x_str}t \\\\
        y(t) &= ${v0y_str}t - ${half_g_str}t^2
        \\end{align}
    `;

    dynamicEquationsDiv.innerHTML = `$$ ${latex} $$`;

    if (window.MathJax) {
        if (window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([dynamicEquationsDiv]);
        } else if (window.MathJax.Hub) {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, dynamicEquationsDiv]);
        }
    }
}

function updateTimeDisplay() {
    timeDisplay.textContent = `t = ${simParams.currentTime.toFixed(2)} s`;
}


// --- Sketch 1: 軌跡アニメーション (XY平面) ---
const sketchTrajectory = (p) => {
    p.setup = () => {
        let container = document.getElementById('trajectory-canvas-holder');
        p.createCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
        p.background(255);

        if (simParams.isPlaying) {
            const maxTime = parseFloat(timeSlider.max);
            simParams.currentTime += p.deltaTime / 1000.0; 
            if (simParams.currentTime > maxTime) {
                simParams.currentTime = 0; 
            }
            timeSlider.value = simParams.currentTime;
            updateTimeDisplay();
        }

        // ★ スケール固定ロジック ★
        // 初速v0で到達可能な最大範囲を基準にする
        // X軸: 45度で投げたときの距離 + 余裕
        // Y軸: 90度で投げたときの高さ + 余裕
        const xRange = simParams.maxPossibleX * 1.1; 
        const yRange = simParams.maxPossibleY * 1.5; // 矢印表示スペースのため少し広めに
        
        const padding = 40;
        const mapX = (x) => p.map(x, 0, xRange, padding, p.width - padding);
        const mapY = (y) => p.map(y, 0, yRange, p.height - padding, padding); // Y軸反転

        // 軸 (原点で交わるように)
        drawAxes(p, mapX, mapY, 0, xRange, 0, yRange, "x [m]", "y [m]");

        // --- 初速ベクトルの描画 ---
        // 原点 (0,0) から (v0x, v0y) へのベクトル
        // ただし、v0x, v0y は速度(m/s)なので、グラフ上の距離(m)とは単位が違う。
        // 見た目のために適当なスケーリング係数を掛けて表示する。
        // 例えば「1秒間に進む距離」としてそのままプロットするのもあり。
        const vecScale = 1.0; // ベクトル表示倍率 (1.0なら1秒後の到達点)
        const vecX = simParams.v0x * vecScale;
        const vecY = simParams.v0y * vecScale;
        
        // 矢印 (青色)
        drawArrow(p, mapX(0), mapY(0), mapX(vecX), mapY(vecY), '#1E88E5');
        
        // 角度円弧
        let radius = 50;
        let startAngle = -p.radians(simParams.theta); // p5のarcは時計回りが正、かつ0が右
        p.noFill();
        p.stroke(100);
        if (simParams.theta > 0) {
            p.arc(mapX(0), mapY(0), radius, radius, startAngle, 0);
            p.fill(100); p.noStroke();
            p.text("θ", mapX(0) + radius/2 + 5, mapY(0) - 5);
        }

        // --- 軌跡 (放物線) ---
        p.stroke(180);
        p.strokeWeight(2);
        p.noFill();
        p.beginShape();
        const steps = 100;
        const tEnd = Math.max(simParams.tLand, 0.1);
        for (let i = 0; i <= steps; i++) {
            let t = (i / steps) * tEnd;
            let x = simParams.v0x * t;
            let y = simParams.v0y * t - 0.5 * simParams.g * t * t;
            p.vertex(mapX(x), mapY(y));
        }
        p.endShape();

        // --- 現在のボール ---
        let curT = simParams.currentTime;
        let curX = simParams.v0x * curT;
        let curY = simParams.v0y * curT - 0.5 * simParams.g * curT * curT;
        
        // 地面より下でも計算通り描画するが、影は地面に
        let displayY = curY;
        
        // ボール
        p.fill(30, 136, 229);
        p.stroke(0);
        p.strokeWeight(1);
        p.ellipse(mapX(curX), mapY(displayY), 12, 12);
        
        // 影 (地面より上のときだけ)
        if (displayY > 0) {
            p.fill(0, 20);
            p.noStroke();
            p.ellipse(mapX(curX), mapY(0), 12, 4);
        }
    };
    
    // 矢印描画ヘルパー
    function drawArrow(p, x1, y1, x2, y2, color) {
        p.push();
        p.stroke(color);
        p.strokeWeight(2);
        p.fill(color);
        p.line(x1, y1, x2, y2);
        
        let angle = Math.atan2(y2 - y1, x2 - x1);
        p.translate(x2, y2);
        p.rotate(angle);
        let arrowSize = 7;
        p.triangle(0, 0, -arrowSize, arrowSize/2, -arrowSize, -arrowSize/2);
        p.pop();
        
        // ラベル v0
        p.fill(color); p.noStroke();
        p.text("v₀", (x1+x2)/2, (y1+y2)/2 - 10);
    }

    p.windowResized = () => {
        let container = document.getElementById('trajectory-canvas-holder');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
};


// --- Sketch 2: 速度グラフ (t vs x', y') ---
const sketchVelocity = (p) => {
    p.setup = () => {
        let container = document.getElementById('velocity-canvas-holder');
        p.createCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
        p.background(255);
        
        // ★ スケール固定 (最大滞空時間を基準)
        const tMax = Math.max(1, simParams.maxPossibleT * 1.1);
        
        // 速度軸: 最大値は v0, 最小値は -v0 (落下時の速度は最大v0になるため)
        let vMax = Math.max(1, simParams.v0 * 1.1);
        let vMin = -vMax;
        
        const padding = 40;
        const mapX = (t) => p.map(t, 0, tMax, padding, p.width - padding);
        const mapY = (v) => p.map(v, vMin, vMax, p.height - padding, padding);

        drawAxes(p, mapX, mapY, 0, tMax, vMin, vMax, "t [s]", "v [m/s]");

        // x'(t) (青)
        p.stroke(30, 136, 229); p.strokeWeight(2); p.noFill();
        p.beginShape();
        // 着地までは定数、その後は0にするか？ 数学的にはずっと続くが、物理的には着地で止まる。
        // ここではグラフとして数式の形を見せたいので、tLand まで描画する
        let drawEndTime = simParams.tLand > 0 ? simParams.tLand : tMax;
        
        p.vertex(mapX(0), mapY(simParams.v0x));
        p.vertex(mapX(drawEndTime), mapY(simParams.v0x));
        p.endShape();

        // y'(t) (赤)
        p.stroke(229, 57, 53); p.strokeWeight(2);
        p.beginShape();
        p.vertex(mapX(0), mapY(simParams.v0y));
        let endVy = simParams.v0y - simParams.g * drawEndTime;
        p.vertex(mapX(drawEndTime), mapY(endVy));
        p.endShape();

        // 現在時刻バー
        drawTimeIndicator(p, mapX, mapY, vMin, vMax);
    };
    p.windowResized = () => {
        let container = document.getElementById('velocity-canvas-holder');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
};


// --- Sketch 3: 位置グラフ (t vs x, y) ---
const sketchPosition = (p) => {
    p.setup = () => {
        let container = document.getElementById('position-canvas-holder');
        p.createCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
        p.background(255);
        
        // ★ スケール固定 (最大滞空時間を基準)
        const tMax = Math.max(1, simParams.maxPossibleT * 1.1);
        
        // 位置軸の範囲: 最大飛距離 (x) が支配的になることが多い
        let posMax = Math.max(1, simParams.maxPossibleX) * 1.1;
        let posMin = 0;
        
        const padding = 40;
        const mapX = (t) => p.map(t, 0, tMax, padding, p.width - padding);
        const mapY = (pos) => p.map(pos, posMin, posMax, p.height - padding, padding);

        drawAxes(p, mapX, mapY, 0, tMax, posMin, posMax, "t [s]", "Pos [m]");

        let drawEndTime = simParams.tLand > 0 ? simParams.tLand : tMax;

        // x(t) (青)
        p.stroke(30, 136, 229); p.strokeWeight(2); p.noFill();
        p.beginShape();
        p.vertex(mapX(0), mapY(0));
        p.vertex(mapX(drawEndTime), mapY(simParams.v0x * drawEndTime));
        p.endShape();

        // y(t) (赤)
        p.stroke(229, 57, 53); p.strokeWeight(2);
        p.beginShape();
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
            let t = (i / steps) * drawEndTime;
            let y = simParams.v0y * t - 0.5 * simParams.g * t * t;
            p.vertex(mapX(t), mapY(y));
        }
        p.endShape();

        // 現在時刻バー
        drawTimeIndicator(p, mapX, mapY, posMin, posMax);
    };
    p.windowResized = () => {
        let container = document.getElementById('position-canvas-holder');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
};


// --- 共通描画関数 (修正版: 原点交差) ---
function drawAxes(p, mapX, mapY, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const padding = 40;
    p.stroke(0); p.strokeWeight(1); p.fill(0); p.textSize(12);

    // 原点のスクリーン座標
    // 範囲外にあっても、map関数は外側の座標を返すので線は引ける
    // ただし、画面内に収まるようにクリップするか、あるいは常に画面端に表示するか。
    // 要望は「原点で交わるように」なので、0の位置に引く。
    let yOrigin = mapY(0); 
    let xOrigin = mapX(0);

    // X軸 (y=0)
    // 画面内にある場合のみ描画、あるいは範囲外でも描画してクリッピング
    // ここでは画面範囲内 (padding考慮) にあるときだけ線を描く
    if (yOrigin >= padding && yOrigin <= p.height - padding) {
        p.line(padding, yOrigin, p.width - padding, yOrigin);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text(xLabel, p.width - 10, yOrigin - 5);
    } else {
        // 原点が画面外の場合、下端または上端に軸を表示（ガイドとして）
        let drawY = (yOrigin > p.height/2) ? p.height - padding : padding;
        p.stroke(150); // 薄くする
        p.line(padding, drawY, p.width - padding, drawY);
        p.stroke(0);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text(xLabel, p.width - 10, drawY - 5);
    }

    // Y軸 (x=0)
    if (xOrigin >= padding && xOrigin <= p.width - padding) {
        p.line(xOrigin, padding, xOrigin, p.height - padding);
        p.textAlign(p.LEFT, p.TOP);
        p.text(yLabel, xOrigin + 5, 10);
    } else {
        let drawX = (xOrigin > p.width/2) ? p.width - padding : padding;
        p.stroke(150);
        p.line(drawX, padding, drawX, p.height - padding);
        p.stroke(0);
        p.textAlign(p.LEFT, p.TOP);
        p.text(yLabel, drawX + 5, 10);
    }

    // 目盛り
    p.stroke(200); 
    
    // X目盛り
    p.textAlign(p.CENTER, p.TOP);
    const xStep = (xMax - xMin) / 5;
    for (let v = xMin; v <= xMax; v += xStep) {
        if (Math.abs(v) < 0.001) continue; // 原点は描画しない（重なるため）
        let x = mapX(v);
        // 画面内のみ
        if (x >= padding && x <= p.width - padding) {
            p.line(x, padding, x, p.height - padding); // グリッド
            p.noStroke();
            // X軸の近くに数値を配置（軸が画面外なら下端）
            let labelY = (yOrigin >= padding && yOrigin <= p.height - padding) ? yOrigin + 5 : p.height - padding + 5;
            p.text(v.toFixed(1), x, labelY);
            p.stroke(200);
        }
    }

    // Y目盛り
    p.textAlign(p.RIGHT, p.MIDDLE);
    const yStep = (yMax - yMin) / 5;
    for (let v = yMin; v <= yMax; v += yStep) {
        if (Math.abs(v) < 0.001) continue;
        let y = mapY(v);
        if (y >= padding && y <= p.height - padding) {
            p.line(padding, y, p.width - padding, y); // グリッド
            p.noStroke();
            // Y軸の近くに数値を配置
            let labelX = (xOrigin >= padding && xOrigin <= p.width - padding) ? xOrigin - 5 : padding - 5;
            p.text(v.toFixed(1), labelX, y);
            p.stroke(200);
        }
    }
}

// 現在時刻を示す縦線を描画
function drawTimeIndicator(p, mapX, mapY, minVal, maxVal) {
    let t = simParams.currentTime;
    let x = mapX(t);
    
    // 画面内のみ
    if (x < 0 || x > p.width) return;

    p.stroke(0, 150, 0, 150); // 緑半透明
    p.strokeWeight(2);
    p.drawingContext.setLineDash([5, 5]);
    
    // 上下の範囲制限
    let yTop = mapY(maxVal);
    let yBottom = mapY(minVal);
    yTop = p.constrain(yTop, 0, p.height);
    yBottom = p.constrain(yBottom, 0, p.height);

    p.line(x, yBottom, x, yTop);
    p.drawingContext.setLineDash([]);
    
    p.fill(0, 100, 0); p.noStroke();
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text("t", x, yBottom - 5);
}