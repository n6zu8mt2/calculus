/**
 * 回転行列シミュレーター
 */

// グローバル状態
const state = {
    angleDeg: 30, // 初期値 30度
    vec: { x: 1, y: 2 }, // 初期値 (1, 2)
    
    // 描画設定
    gridSize: 60,
    zoom: 1.0,
    pan: { x: 0, y: 0 }
};

// UI要素
let angleSlider, angleInput;
let vecXInput, vecYInput;
let sliderX, sliderY;
let matrixValueDiv, vectorInfoBar;

// p5インスタンス
let sketchP5;

// 定数
const GRID_SIZE = 60;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 要素取得
    angleSlider = document.getElementById('angle-slider');
    angleInput = document.getElementById('angle-input');
    vecXInput = document.getElementById('vec-x');
    vecYInput = document.getElementById('vec-y');
    sliderX = document.getElementById('slider-x');
    sliderY = document.getElementById('slider-y');
    
    matrixValueDiv = document.getElementById('matrix-value');
    vectorInfoBar = document.getElementById('vector-info-bar');

    // --- イベントリスナー設定 ---

    const syncAngle = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) return;
        state.angleDeg = v;
        angleSlider.value = v;
        angleInput.value = v;
        updateDisplay();
    };
    angleSlider.addEventListener('input', (e) => syncAngle(e.target.value));
    angleInput.addEventListener('input', (e) => syncAngle(e.target.value));

    const syncVecX = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) return;
        state.vec.x = v;
        vecXInput.value = v;
        sliderX.value = v;
        updateDisplay();
    };
    vecXInput.addEventListener('input', (e) => syncVecX(e.target.value));
    sliderX.addEventListener('input', (e) => syncVecX(e.target.value));

    const syncVecY = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) return;
        state.vec.y = v;
        vecYInput.value = v;
        sliderY.value = v;
        updateDisplay();
    };
    vecYInput.addEventListener('input', (e) => syncVecY(e.target.value));
    sliderY.addEventListener('input', (e) => syncVecY(e.target.value));

    // 初回更新
    sliderX.value = state.vec.x;
    sliderY.value = state.vec.y;
    updateDisplay();

    // p5.js 開始
    new p5(sketch, 'canvas-holder');
});

function updateUIFromState() {
    vecXInput.value = state.vec.x.toFixed(1);
    vecYInput.value = state.vec.y.toFixed(1);
    sliderX.value = state.vec.x;
    sliderY.value = state.vec.y;
    updateDisplay();
}

function updateDisplay() {
    const rad = state.angleDeg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const rx = state.vec.x * cos - state.vec.y * sin;
    const ry = state.vec.x * sin + state.vec.y * cos;

    const matTex = `
        R(${state.angleDeg}^\\circ) = 
        \\begin{pmatrix} \\cos ${state.angleDeg}^\\circ & -\\sin ${state.angleDeg}^\\circ \\\\ \\sin ${state.angleDeg}^\\circ & \\cos ${state.angleDeg}^\\circ \\end{pmatrix}
        \\approx 
        \\begin{pmatrix} ${cos.toFixed(2)} & ${(-sin).toFixed(2)} \\\\ ${sin.toFixed(2)} & ${cos.toFixed(2)} \\end{pmatrix}
    `;
    matrixValueDiv.innerHTML = `$$ ${matTex} $$`;

    const latex = `
        \\text{入力 } \\boldsymbol{x} = \\begin{pmatrix} ${state.vec.x.toFixed(2)} \\\\ ${state.vec.y.toFixed(2)} \\end{pmatrix}
        \\quad \\xrightarrow{R(\\theta)} \\quad
        \\text{出力 } \\boldsymbol{x}' = \\begin{pmatrix} ${rx.toFixed(2)} \\\\ ${ry.toFixed(2)} \\end{pmatrix}
    `;
    vectorInfoBar.innerHTML = `$$ ${latex} $$`;

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([matrixValueDiv, vectorInfoBar]);
    }
}


// --- p5.js Sketch ---
const sketch = (p) => {
    let isDraggingVec = false;
    let isPanning = false;
    let dragStart = {x:0, y:0};
    let panStart = {x:0, y:0};

    p.setup = () => {
        let container = document.getElementById('canvas-holder');
        p.createCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2); 

        const zoom = state.zoom;
        const pan = state.pan;
        const scale = GRID_SIZE * zoom;

        // 1. グリッドと軸
        drawGridLines(p, scale, pan);
        drawAxes(p, scale, pan);
        drawUnitCircle(p, scale, pan);

        // 2. 原点と角度ラジアン
        const origin = toScreen(0, 0, scale, pan);
        const rad = state.angleDeg * Math.PI / 180;
        
        // --- 変換後の基底ベクトル ---
        const e1x = Math.cos(rad);
        const e1y = Math.sin(rad);
        const re1Head = toScreen(e1x, e1y, scale, pan);
        drawVector(p, origin, re1Head, '#1565C0', 'Re₁', false, 2);

        const e2x = -Math.sin(rad);
        const e2y = Math.cos(rad);
        const re2Head = toScreen(e2x, e2y, scale, pan);
        drawVector(p, origin, re2Head, '#C62828', 'Re₂', false, 2);

        // --- 入力・出力ベクトル ---
        const vHead = toScreen(state.vec.x, state.vec.y, scale, pan);
        drawVector(p, origin, vHead, '#43A047', 'x', false, 3);

        const rx = state.vec.x * Math.cos(rad) - state.vec.y * Math.sin(rad);
        const ry = state.vec.x * Math.sin(rad) + state.vec.y * Math.cos(rad);
        const rHead = toScreen(rx, ry, scale, pan);
        drawVector(p, origin, rHead, '#2E7D32', "x'", false, 3);

        // 4. 回転角の可視化 (円弧)
        // 角度差 (数学座標で+θ => p5座標で-θ)
        let angleDiff = -rad;

        // (A) x -> x' の間の角度
        const radius = p.dist(origin.x, origin.y, vHead.x, vHead.y);
        if (radius > 10) {
            // 軌跡
            p.noFill(); p.stroke(200); p.strokeWeight(1);
            p.drawingContext.setLineDash([5, 5]);
            p.circle(origin.x, origin.y, radius * 2);
            p.drawingContext.setLineDash([]);

            // 円弧
            let startAngle = Math.atan2(vHead.y - origin.y, vHead.x - origin.x);
            let endAngle = startAngle + angleDiff;
            drawAngleArc(p, origin, radius * 0.4, startAngle, endAngle, "θ");
        }

        // (B) x軸(e1) -> Re1 の間の角度 (追加要望)
        // e1(1, 0) は p5画面上では (1, 0)方向 (右) -> angle 0
        // Re1 は 画面上 angleDiff (-θ) の方向
        // 単位円より少し内側または外側に表示
        let axisRadius = scale * 0.6; // 単位円(scale)より小さめ
        drawAngleArc(p, origin, axisRadius, 0, angleDiff, "θ", "#1565C0");

        // 5. ハンドル (xの先端)
        p.fill(255); p.stroke('#43A047'); p.strokeWeight(2);
        // マウス判定用 (p.mouseX は絶対座標)
        // vHead.x は p.translate 後の座標
        // dist計算には translate 分の補正が必要
        if (p.dist(p.mouseX - p.width/2, p.mouseY - p.height/2, vHead.x, vHead.y) < 10) {
            p.fill('#43A047');
            p.cursor('move');
        } else {
            p.cursor('default');
        }
        p.circle(vHead.x, vHead.y, 10);
    };

    // 角度円弧描画ヘルパー
    function drawAngleArc(p, center, diameter, startA, endA, label, colorStr = "#000") {
        p.stroke(colorStr);
        p.strokeWeight(2);
        p.noFill();
        
        // p5.arc は時計回りに描画 (start -> stop)
        // angleDeg >= 0 (数学:反時計) -> p5: 負の回転 (endA < startA)
        // 描画順: endA -> startA
        if (state.angleDeg >= 0) {
            p.arc(center.x, center.y, diameter, diameter, endA, startA);
        } else {
            p.arc(center.x, center.y, diameter, diameter, startA, endA);
        }

        // ラベル
        let midAngle = (startA + endA) / 2;
        let labelR = diameter / 2 + 15;
        p.noStroke(); p.fill(colorStr); p.textAlign(p.CENTER, p.CENTER);
        p.textSize(12);
        p.text(label, center.x + Math.cos(midAngle)*labelR, center.y + Math.sin(midAngle)*labelR);
    }

    // --- インタラクション ---
    p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        // p.translate されているので、原点基準の相対座標 mx, my を使う
        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;

        const scale = GRID_SIZE * state.zoom;
        const pan = state.pan;
        
        let vHead = toScreen(state.vec.x, state.vec.y, scale, pan);
        
        // dist計算も相対座標同士で行う
        if (p.dist(mx, my, vHead.x, vHead.y) < 15) {
            isDraggingVec = true;
        } else {
            isPanning = true;
            dragStart = { x: mx, y: my };
            panStart = { x: state.pan.x, y: state.pan.y };
        }
    };

    p.mouseDragged = () => {
        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        const scale = GRID_SIZE * state.zoom;

        if (isDraggingVec) {
            // mx, my を渡して数学座標を計算
            let m = toMath(mx, my, scale, state.pan);
            state.vec.x = m.x;
            state.vec.y = m.y;
            updateUIFromState();
        } else if (isPanning) {
            state.pan.x = panStart.x + (mx - dragStart.x);
            state.pan.y = panStart.y + (my - dragStart.y);
        }
    };

    p.mouseReleased = () => {
        isDraggingVec = false;
        isPanning = false;
    };

    p.mouseWheel = (e) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            let mx = p.mouseX - p.width/2;
            let my = p.mouseY - p.height/2;
            
            let mathPos = toMath(mx, my, GRID_SIZE * state.zoom, state.pan);
            let sensitivity = 0.001;
            let factor = Math.exp(-e.delta * sensitivity);
            let newZoom = state.zoom * factor;
            newZoom = Math.max(0.1, Math.min(20.0, newZoom));

            state.pan.x = mx - mathPos.x * GRID_SIZE * newZoom;
            state.pan.y = my - (-mathPos.y * GRID_SIZE * newZoom);
            state.zoom = newZoom;
            
            return false;
        }
        return true;
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-holder');
        p.resizeCanvas(container.clientWidth, container.clientHeight);
    };

    // --- ヘルパー関数 ---
    function toScreen(mathX, mathY, scale, pan) {
        return {
            x: mathX * scale + pan.x,
            y: -mathY * scale + pan.y // Y軸反転
        };
    }

    function toMath(screenX, screenY, scale, pan) {
        return {
            x: (screenX - pan.x) / scale,
            y: -(screenY - pan.y) / scale
        };
    }

    function getVisibleRange(p, scale, pan) {
        let p1 = toMath(-p.width/2, -p.height/2, scale, pan);
        let p2 = toMath(p.width/2, -p.height/2, scale, pan);
        let p3 = toMath(p.width/2, p.height/2, scale, pan);
        let p4 = toMath(-p.width/2, p.height/2, scale, pan);
        
        let xMin = Math.min(p1.x, p2.x, p3.x, p4.x);
        let xMax = Math.max(p1.x, p2.x, p3.x, p4.x);
        let yMin = Math.min(p1.y, p2.y, p3.y, p4.y);
        let yMax = Math.max(p1.y, p2.y, p3.y, p4.y);

        return {
            xMin: Math.floor(xMin) - 1,
            xMax: Math.ceil(xMax) + 1,
            yMin: Math.floor(yMin) - 1,
            yMax: Math.ceil(yMax) + 1
        };
    }

    function drawUnitCircle(p, scale, pan) {
        p.push();
        let origin = toScreen(0, 0, scale, pan);
        p.noFill();
        p.stroke(180); 
        p.strokeWeight(1);
        p.circle(origin.x, origin.y, 2 * scale);
        p.pop();
    }

    function drawGridLines(p, scale, pan) {
        p.stroke(240); p.strokeWeight(1);
        let range = getVisibleRange(p, scale, pan);

        for (let x = range.xMin; x <= range.xMax; x++) {
            let s = toScreen(x, 0, scale, pan);
            p.line(s.x, -p.height, s.x, p.height);
        }
        for (let y = range.yMin; y <= range.yMax; y++) {
            let s = toScreen(0, y, scale, pan);
            p.line(-p.width, s.y, p.width, s.y);
        }
    }

    function drawAxes(p, scale, pan) {
        p.stroke(0); p.strokeWeight(1);
        let o = toScreen(0, 0, scale, pan);
        p.line(-p.width, o.y, p.width, o.y); 
        p.line(o.x, -p.height, o.x, p.height); 
        
        drawAxisArrow(p, {x:-p.width, y:o.y}, {x:p.width, y:o.y});
        drawAxisArrow(p, {x:o.x, y:p.height}, {x:o.x, y:-p.height});

        p.fill(100); p.noStroke(); p.textSize(10);
        let range = getVisibleRange(p, scale, pan);
        let step = 1;
        if (state.zoom < 0.5) step = 2;
        if (state.zoom < 0.25) step = 5;

        p.textAlign(p.CENTER, p.TOP);
        for (let x = range.xMin; x <= range.xMax; x+=step) {
            if (x===0) continue;
            let s = toScreen(x, 0, scale, pan);
            p.stroke(0); p.line(s.x, s.y - 3, s.x, s.y + 3);
            p.noStroke(); p.text(x, s.x, s.y + 5);
        }
        p.textAlign(p.RIGHT, p.MIDDLE);
        for (let y = range.yMin; y <= range.yMax; y+=step) {
            if (y===0) continue;
            let s = toScreen(0, y, scale, pan);
            p.stroke(0); p.line(s.x - 3, s.y, s.x + 3, s.y);
            p.noStroke(); p.text(y, s.x - 5, s.y);
        }
    }

    function drawAxisArrow(p, start, end) {
        p.push();
        p.translate(end.x, end.y);
        let angle = Math.atan2(end.y - start.y, end.x - start.x);
        p.rotate(angle);
        p.fill(0); p.noStroke();
        p.triangle(0, 0, -8, 4, -8, -4);
        p.pop();
    }

    function drawVector(p, start, end, color, label, isGhost=false, weight=3) {
        p.push();
        if (isGhost) {
            p.stroke(color); p.strokeWeight(2);
            p.drawingContext.setLineDash([5, 5]);
        } else {
            p.stroke(color); p.strokeWeight(weight);
            p.drawingContext.setLineDash([]);
        }
        
        p.line(start.x, start.y, end.x, end.y);
        
        let angle = Math.atan2(end.y - start.y, end.x - start.x);
        p.translate(end.x, end.y);
        p.rotate(angle);
        p.fill(isGhost ? 255 : color);
        if(isGhost) p.noFill();
        let arrowSize = weight * 2 + 2;
        p.triangle(0, 0, -arrowSize, arrowSize/2, -arrowSize, -arrowSize/2);
        p.pop();

        if (label) {
            p.noStroke(); p.fill(color); p.textSize(14);
            p.text(label, end.x + 10, end.y);
        }
        p.pop();
    }
};