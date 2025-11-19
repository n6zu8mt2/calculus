// --- グローバル変数 ---
let p5sketch;
let currentFuncKey = 'sqrt2';
let startX = 2.0;
let currentX = 2.0;
let stepCount = 0;
let history = []; // 履歴: [{x: number, y: number, nextX: number}, ...]
let autoPlayInterval = null;

// ビュー操作用変数
let viewZoom = 1.0;
let viewOffsetX = 0;
let viewOffsetY = 0;
let isDragging = false;
let dragStartX, dragStartY;
let defaultXRange, defaultYRange; // 初期範囲保存用

// DOM要素
let funcSelector, startXInput, nextBtn, autoBtn, resetBtn;
let zoomInBtn, zoomOutBtn, resetViewBtn;
let stepCountDisplay, currentXTd, currentFxTd, nextXTd, trueValueTd;

// 関数定義
const functions = {
    'sqrt2': {
        f: (x) => x * x - 2,
        df: (x) => 2 * x,
        label: 'f(x) = x^2 - 2',
        trueValueLabel: '$\\sqrt{2} \\approx 1.41421356...$',
        trueValue: Math.sqrt(2),
        defaultX: 2.0,
        xRange: [-0.5, 3.5],
        yRange: [-3, 8]
    },
    'sqrt3': {
        f: (x) => x * x - 3,
        df: (x) => 2 * x,
        label: 'f(x) = x^2 - 3',
        trueValueLabel: '$\\sqrt{3} \\approx 1.73205080...$',
        trueValue: Math.sqrt(3),
        defaultX: 2.0,
        xRange: [-0.5, 4],
        yRange: [-4, 10]
    },
    'sin': {
        f: (x) => Math.sin(x),
        df: (x) => Math.cos(x),
        label: 'f(x) = sin(x)',
        trueValueLabel: '$\\pi \\approx 3.14159265...$',
        trueValue: Math.PI,
        defaultX: 2.0, // 2.0から始めるとπに収束しやすい(3.0だと近すぎるため2.0に設定)
        xRange: [0, 7],
        yRange: [-2, 2]
    }
};

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    funcSelector = document.getElementById('funcSelector');
    startXInput = document.getElementById('startX');
    nextBtn = document.getElementById('nextBtn');
    autoBtn = document.getElementById('autoBtn');
    resetBtn = document.getElementById('resetBtn');
    zoomInBtn = document.getElementById('zoomInBtn');
    zoomOutBtn = document.getElementById('zoomOutBtn');
    resetViewBtn = document.getElementById('resetViewBtn');
    
    stepCountDisplay = document.getElementById('stepCountDisplay');
    currentXTd = document.getElementById('currentX');
    currentFxTd = document.getElementById('currentFx');
    nextXTd = document.getElementById('nextX');
    trueValueTd = document.getElementById('trueValue');

    // p5.js インスタンス作成
    p5sketch = new p5(sketch);

    // イベントリスナー
    funcSelector.addEventListener('change', () => {
        // 関数変更時は初期値もデフォルトに戻す
        startXInput.value = functions[funcSelector.value].defaultX;
        resetSimulation();
    });
    startXInput.addEventListener('input', () => {
        // 入力中はリセットせず、値を反映するだけ（再開時に有効）
        startX = parseFloat(startXInput.value);
        // シミュレーション途中ならリセットして反映
        if (stepCount > 0) resetSimulation();
        else {
             currentX = startX;
             updateDisplay(); // 表示だけ更新
             p5sketch.redraw();
        }
    });

    nextBtn.addEventListener('click', nextStep);
    resetBtn.addEventListener('click', resetSimulation);
    autoBtn.addEventListener('click', toggleAutoPlay);
    
    // ビュー操作ボタン
    zoomInBtn.addEventListener('click', () => applyZoom(1.2));
    zoomOutBtn.addEventListener('click', () => applyZoom(0.8));
    resetViewBtn.addEventListener('click', resetView);

    // 初期化実行
    resetSimulation();
});

// --- シミュレーション制御 ---

function resetSimulation() {
    stopAutoPlay();
    currentFuncKey = funcSelector.value;
    const def = functions[currentFuncKey];
    
    startX = parseFloat(startXInput.value);
    currentX = startX;
    stepCount = 0;
    history = []; // 履歴クリア
    
    // ビューのリセット（関数が変わった時など）
    defaultXRange = def.xRange;
    defaultYRange = def.yRange;
    resetView();

    updateDisplay();
    // MathJaxの初期レンダリング
    updateMathJax();
    p5sketch.redraw();
}

function resetView() {
    viewZoom = 1.0;
    viewOffsetX = 0;
    viewOffsetY = 0;
    if (p5sketch) p5sketch.redraw();
}

function applyZoom(factor) {
    viewZoom *= factor;
    if (p5sketch) p5sketch.redraw();
}

function nextStep() {
    const def = functions[currentFuncKey];
    const y = def.f(currentX);
    const slope = def.df(currentX);

    if (Math.abs(slope) < 1e-12) {
        alert("傾きが0に近いため、これ以上計算できません。");
        stopAutoPlay();
        return;
    }

    // ニュートン法: x_{n+1} = x_n - f(x_n) / f'(x_n)
    const nextX = currentX - y / slope;

    // 履歴に保存 (現在の点と、次のX座標)
    history.push({
        n: stepCount,
        x: currentX,
        y: y,
        slope: slope,
        nextX: nextX
    });

    currentX = nextX;
    stepCount++;

    updateDisplay();
    updateMathJax();
    p5sketch.redraw();
}

function toggleAutoPlay() {
    if (autoPlayInterval) {
        stopAutoPlay();
    } else {
        autoBtn.textContent = "ストップ";
        autoBtn.style.backgroundColor = "#e53935";
        autoPlayInterval = setInterval(nextStep, 1000); // 1秒ごとに実行
    }
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    autoBtn.textContent = "自動再生";
    autoBtn.style.backgroundColor = "#4caf50";
}

function updateDisplay() {
    const def = functions[currentFuncKey];
    const y = def.f(currentX);
    const slope = def.df(currentX);
    
    let nextXVal = "---";
    if (Math.abs(slope) > 1e-12) {
        nextXVal = (currentX - y / slope).toFixed(10);
    }

    // HTML更新
    // stepCountDisplay は MathJax 用に別途更新
    currentXTd.textContent = currentX.toFixed(10);
    currentFxTd.textContent = y.toFixed(10);
    nextXTd.textContent = nextXVal;
    
    // 真の値（HTMLタグを含むのでinnerHTML）
    trueValueTd.innerHTML = def.trueValueLabel;
}

function updateMathJax() {
    // stepCountDisplayの内容を更新してMathJaxを適用
    stepCountDisplay.innerHTML = `\\( n = ${stepCount} \\)`;
    trueValueTd.innerHTML = functions[currentFuncKey].trueValueLabel; // 真の値も再レンダリング

    if (window.MathJax) {
        // Promiseベース (v3) または Queueベース (v2) でレンダリング
        if (window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([stepCountDisplay, trueValueTd]).catch(err => console.log(err));
        } else if (window.MathJax.Hub) {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, stepCountDisplay]);
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, trueValueTd]);
        }
    }
}


// --- p5.js スケッチ ---
const sketch = (p) => {
    let padding = 40;
    let isMouseDrag = false;

    p.setup = () => {
        let canvas = p.createCanvas(700, 400);
        canvas.parent('canvas-holder');
        p.noLoop();
    };

    // 座標変換（ズーム・パン適用）
    function toScreenX(x, xRange) {
        // 基本の幅
        const baseW = xRange[1] - xRange[0];
        // ズーム後の幅
        const zoomedW = baseW / viewZoom;
        // 中心のX座標（パン適用）
        const centerX = (xRange[0] + xRange[1]) / 2 - viewOffsetX;
        
        // 現在のビュー範囲
        const currentMin = centerX - zoomedW / 2;
        const currentMax = centerX + zoomedW / 2;
        
        return p.map(x, currentMin, currentMax, padding, p.width - padding);
    }

    function toScreenY(y, yRange) {
        const baseH = yRange[1] - yRange[0];
        const zoomedH = baseH / viewZoom;
        const centerY = (yRange[0] + yRange[1]) / 2 + viewOffsetY; // Yは上がプラスなので符号注意（p5は下がプラス）
        // 数学座標系でのビュー範囲
        const currentMin = centerY - zoomedH / 2;
        const currentMax = centerY + zoomedH / 2;
        
        return p.map(y, currentMin, currentMax, p.height - padding, padding);
    }

    // 逆変換（マウス操作用）
    function fromScreenX(sx, xRange) {
        const baseW = xRange[1] - xRange[0];
        const zoomedW = baseW / viewZoom;
        const centerX = (xRange[0] + xRange[1]) / 2 - viewOffsetX;
        const currentMin = centerX - zoomedW / 2;
        const currentMax = centerX + zoomedW / 2;
        return p.map(sx, padding, p.width - padding, currentMin, currentMax);
    }

    function fromScreenY(sy, yRange) {
        const baseH = yRange[1] - yRange[0];
        const zoomedH = baseH / viewZoom;
        const centerY = (yRange[0] + yRange[1]) / 2 + viewOffsetY;
        const currentMin = centerY - zoomedH / 2;
        const currentMax = centerY + zoomedH / 2;
        return p.map(sy, p.height - padding, padding, currentMin, currentMax);
    }


    p.draw = () => {
        p.background(255);
        
        const def = functions[currentFuncKey];
        const xRange = def.xRange;
        const yRange = def.yRange;

        // --- 軸とグリッド ---
        drawAxes(p, xRange, yRange);

        // --- 関数 y=f(x) の描画 ---
        p.noFill();
        p.stroke(0);
        p.strokeWeight(1.5);
        p.beginShape();
        
        // 画面に見えている範囲だけ描画して効率化＆連続性確保
        // 画面左端のx値、右端のx値を取得
        const viewLeftX = fromScreenX(0, xRange);
        const viewRightX = fromScreenX(p.width, xRange);
        const step = (viewRightX - viewLeftX) / 500; // 分解能

        for (let x = viewLeftX; x <= viewRightX; x += step) {
            let y = def.f(x);
            // 描画範囲内チェック（あまりに大きい値は除外）
            if (Math.abs(y) < (yRange[1]-yRange[0]) * 100) {
                p.vertex(toScreenX(x, xRange), toScreenY(y, yRange));
            } else {
                p.endShape();
                p.beginShape();
            }
        }
        p.endShape();

        // --- 履歴の描画 (過去のステップも全て表示) ---
        for (let i = 0; i < history.length; i++) {
            const h = history[i];
            
            // 1. 点 (x_n, f(x_n))
            let px = toScreenX(h.x, xRange);
            let py = toScreenY(h.y, yRange);
            
            // 2. 接線: (x_n, y_n) -> (x_{n+1}, 0)
            let nextPx = toScreenX(h.nextX, xRange);
            let zeroPy = toScreenY(0, yRange);

            // 色: 最新は濃い赤、過去は薄い赤
            const isLast = (i === history.length - 1);
            const alpha = isLast ? 255 : 60; // 透明度
            
            // 垂線 (x_n, 0) -> (x_n, y_n)
            p.stroke(30, 136, 229, alpha); // 青
            p.strokeWeight(1);
            p.drawingContext.setLineDash([5, 5]);
            p.line(px, toScreenY(0, yRange), px, py);
            p.drawingContext.setLineDash([]);

            // 点
            p.fill(30, 136, 229, alpha);
            p.noStroke();
            p.ellipse(px, py, isLast ? 8 : 5, isLast ? 8 : 5);

            // 接線
            p.stroke(229, 57, 53, alpha); // 赤
            p.strokeWeight(isLast ? 2 : 1);
            p.line(px, py, nextPx, zeroPy);

            // ラベル (最新のみ、またはズーム時は適宜)
            if (isLast || viewZoom > 5) {
                p.fill(0, alpha);
                p.textAlign(p.LEFT, p.BOTTOM);
                p.textSize(12);
                // 画面外なら描画しない
                if (px > 0 && px < p.width && py > 0 && py < p.height) {
                    p.text(`x${h.n}`, px + 5, py - 5);
                }
            }
        }
        
        // 現在のx_{n+1}の位置に印をつける（次のステップの始点）
        if (history.length > 0) {
            let last = history[history.length - 1];
            let nx = toScreenX(last.nextX, xRange);
            let ny = toScreenY(0, yRange);
            
            p.fill(229, 57, 53);
            p.noStroke();
            p.ellipse(nx, ny, 6, 6);
            p.fill(0);
            p.text(`x${last.n + 1}`, nx + 5, ny + 15);
        } else {
            // 初期状態 x0
            let startPx = toScreenX(currentX, xRange);
            let zeroPy = toScreenY(0, yRange);
            p.fill(30, 136, 229);
            p.ellipse(startPx, zeroPy, 6, 6);
            p.fill(0);
            p.text(`x0`, startPx + 5, zeroPy + 15);
        }

    };

    function drawAxes(p, xRange, yRange) {
        p.stroke(180);
        p.strokeWeight(1);

        // 原点のスクリーン座標
        let originX = toScreenX(0, xRange);
        let originY = toScreenY(0, yRange);

        // グリッドと目盛り（簡易版）
        // 現在のビュー範囲を取得
        const viewLeftX = fromScreenX(0, xRange);
        const viewRightX = fromScreenX(p.width, xRange);
        const viewBottomY = fromScreenY(p.height, yRange);
        const viewTopY = fromScreenY(0, yRange);

        // 目盛り間隔の自動調整
        let xStep = Math.pow(10, Math.floor(Math.log10((viewRightX - viewLeftX) / 5)));
        if ((viewRightX - viewLeftX) / xStep < 3) xStep /= 2;
        let yStep = Math.pow(10, Math.floor(Math.log10((viewTopY - viewBottomY) / 5)));
        if ((viewTopY - viewBottomY) / yStep < 3) yStep /= 2;

        p.textSize(10);
        p.textAlign(p.CENTER, p.TOP);
        p.fill(100);

        // X軸グリッド
        let startIX = Math.floor(viewLeftX / xStep);
        let endIX = Math.ceil(viewRightX / xStep);
        for (let i = startIX; i <= endIX; i++) {
            let x = i * xStep;
            let sx = toScreenX(x, xRange);
            p.stroke(220);
            p.line(sx, 0, sx, p.height); // 縦グリッド
            if (Math.abs(x) > 1e-10) { // 0は軸と重なるので描かない
                p.noStroke();
                p.text(parseFloat(x.toPrecision(4)), sx, Math.min(Math.max(originY + 5, 5), p.height - 15));
            }
        }

        // Y軸グリッド
        let startIY = Math.floor(viewBottomY / yStep);
        let endIY = Math.ceil(viewTopY / yStep);
        p.textAlign(p.RIGHT, p.MIDDLE);
        for (let i = startIY; i <= endIY; i++) {
            let y = i * yStep;
            let sy = toScreenY(y, yRange);
            p.stroke(220);
            p.line(0, sy, p.width, sy); // 横グリッド
            if (Math.abs(y) > 1e-10) {
                p.noStroke();
                p.text(parseFloat(y.toPrecision(4)), Math.min(Math.max(originX - 5, 30), p.width - 5), sy);
            }
        }

        // 軸線 (黒)
        p.stroke(50);
        p.strokeWeight(1.5);
        if (originY >= 0 && originY <= p.height) {
            p.line(0, originY, p.width, originY); // X軸
            p.noStroke(); p.fill(0); p.textAlign(p.RIGHT, p.BOTTOM);
            p.text("x", p.width - 5, originY - 5);
        }
        if (originX >= 0 && originX <= p.width) {
            p.line(originX, 0, originX, p.height); // Y軸
             p.noStroke(); p.fill(0); p.textAlign(p.LEFT, p.TOP);
            p.text("y", originX + 5, 5);
        }
    }

    // --- マウス操作 (ドラッグでパン、ホイールでズーム) ---
    p.mousePressed = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            isMouseDrag = true;
            dragStartX = p.mouseX;
            dragStartY = p.mouseY;
        }
    };

    p.mouseReleased = () => {
        isMouseDrag = false;
    };

    p.mouseDragged = () => {
        if (isMouseDrag) {
            const def = functions[currentFuncKey];
            const xRange = def.xRange;
            const yRange = def.yRange;
            
            // ピクセル差分を数値差分に変換
            const dxPix = p.mouseX - dragStartX;
            const dyPix = p.mouseY - dragStartY;

            const xUnit = (xRange[1] - xRange[0]) / (p.width * viewZoom);
            const yUnit = (yRange[1] - yRange[0]) / (p.height * viewZoom);

            viewOffsetX += dxPix * xUnit;
            viewOffsetY += dyPix * yUnit; // Y軸は上がプラス（p5と逆）だが、画面上のドラッグ方向と合わせるため同符号

            dragStartX = p.mouseX;
            dragStartY = p.mouseY;
            p.redraw();
        }
    };

    p.mouseWheel = (event) => {
        // キャンバス内でのみ有効
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            let zoomFactor = 1.05;
            if (event.delta > 0) {
                viewZoom /= zoomFactor;
            } else {
                viewZoom *= zoomFactor;
            }
            p.redraw();
            return false; // デフォルトのスクロール動作を防止
        }
    };
};