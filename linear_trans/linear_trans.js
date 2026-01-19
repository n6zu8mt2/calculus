/**
 * 線形変換シミュレーター
 * 左: 定義域 (Domain), 右: 値域 (Range)
 */

// グローバル状態
const state = {
    // 行列 A = [[a, b], [c, d]]
    a: 2, b: 1,
    c: 0, d: 3,
    
    // 入力ベクトル x = [vx, vy]
    vx: 1, vy: 1,
    
    // UI状態
    showEigen: false,
    det: 0, // 行列式
    
    // 左右独立ズームとパン (初期値)
    zoomLeft: 1.0,
    panLeft: { x: 0, y: 0 },
    
    zoomRight: 1.0,
    panRight: { x: 0, y: 0 },
    
    // 計算結果キャッシュ
    eigenValues: [],
    eigenVectors: []
};

// UI要素
let inputA, inputB, inputC, inputD;
let sliderA, sliderB, sliderC, sliderD;
let angleInput;
let checkEigen, eigenInfo, valDet;
let vectorInfoBar;
let presetButtons;

// p5インスタンス
let p5Left, p5Right;

// 定数
const GRID_SIZE = 40; 

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 要素取得
    inputA = document.getElementById('mat-a');
    inputB = document.getElementById('mat-b');
    inputC = document.getElementById('mat-c');
    inputD = document.getElementById('mat-d');
    
    sliderA = document.getElementById('slider-a');
    sliderB = document.getElementById('slider-b');
    sliderC = document.getElementById('slider-c');
    sliderD = document.getElementById('slider-d');

    angleInput = document.getElementById('angle-input');

    checkEigen = document.getElementById('checkEigen');
    eigenInfo = document.getElementById('eigen-info');
    valDet = document.getElementById('val-det');
    vectorInfoBar = document.getElementById('vector-info-bar');
    presetButtons = document.querySelectorAll('.preset-btn');

    // イベントリスナー設定
    const syncInput = (input, slider, key) => {
        input.addEventListener('input', () => {
            let val = parseFloat(input.value) || 0;
            state[key] = val;
            slider.value = val;
            updateAll();
        });
        slider.addEventListener('input', () => {
            let val = parseFloat(slider.value) || 0;
            state[key] = val;
            input.value = val;
            updateAll();
        });
    };

    syncInput(inputA, sliderA, 'a');
    syncInput(inputB, sliderB, 'b');
    syncInput(inputC, sliderC, 'c');
    syncInput(inputD, sliderD, 'd');
    
    checkEigen.addEventListener('change', () => {
        state.showEigen = checkEigen.checked;
        eigenInfo.style.display = state.showEigen ? 'block' : 'none';
        updateAll();
    });

    // 回転角度の入力で即座に反映
    angleInput.addEventListener('input', () => {
        setPreset('rotate');
    });

    // プリセットボタン
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setPreset(btn.dataset.type);
        });
    });

    // 初回計算
    updateAll();

    // p5.js 開始
    p5Left = new p5(sketchLeft, 'canvas-left-holder');
    p5Right = new p5(sketchRight, 'canvas-right-holder');
});

// プリセット設定
function setPreset(type) {
    let a=1, b=0, c=0, d=1;
    switch(type) {
        case 'identity': // 単位行列
            a=1; b=0; c=0; d=1; break;
        case 'rotate': // 回転 (入力値を使用)
            let deg = parseFloat(angleInput.value) || 0;
            let th = deg * Math.PI / 180;
            // 反時計回り回転行列
            a = Math.cos(th); b = -Math.sin(th);
            c = Math.sin(th); d = Math.cos(th);
            break;
        case 'scale2': // 拡大
            a=2; b=0; c=0; d=2; break;
        case 'shearX': // せん断
            a=1; b=1; c=0; d=1; break;
        case 'reflectX': // 鏡映 (X軸対称)
            a=1; b=0; c=0; d=-1; break;
        case 'projectionX': // 射影
            a=1; b=0; c=0; d=0; break;
    }
    updateMatrixFromDrag(a, b, c, d);
}

// 全更新処理
function updateAll() {
    calcEigen();
    updateDisplayValues();
}

// 行列の更新
function updateMatrixFromDrag(newA, newB, newC, newD) {
    state.a = newA; state.b = newB;
    state.c = newC; state.d = newD;
    
    const updateUI = (el, sl, val) => {
        let v = Math.abs(val) < 0.001 ? 0 : val; 
        el.value = Number.isInteger(v) ? v : v.toFixed(2);
        sl.value = v;
    };
    updateUI(inputA, sliderA, state.a);
    updateUI(inputB, sliderB, state.b);
    updateUI(inputC, sliderC, state.c);
    updateUI(inputD, sliderD, state.d);
    
    updateAll();
}

// ベクトルの更新
function updateVector(nx, ny) {
    state.vx = nx;
    state.vy = ny;
    updateDisplayValues();
}

// 数値表示更新
function updateDisplayValues() {
    let ax = state.a * state.vx + state.b * state.vy;
    let ay = state.c * state.vx + state.d * state.vy;

    const latex = `
        \\text{入力 } \\boldsymbol{x} = \\begin{pmatrix} ${state.vx.toFixed(2)} \\\\ ${state.vy.toFixed(2)} \\end{pmatrix}
        \\quad \\xrightarrow{A} \\quad
        \\text{出力 } A\\boldsymbol{x} = \\begin{pmatrix} ${ax.toFixed(2)} \\\\ ${ay.toFixed(2)} \\end{pmatrix}
    `;

    vectorInfoBar.innerHTML = `$$ ${latex} $$`;
    valDet.textContent = state.det.toFixed(2);

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([vectorInfoBar, document.querySelector('.det-display')]);
    }
}

// 固有値・行列式計算
function calcEigen() {
    let tr = state.a + state.d;
    let det = state.a * state.d - state.b * state.c;
    state.det = det;
    
    let D = tr * tr - 4 * det;

    state.eigenValues = [];
    state.eigenVectors = [];
    let msg = "";

    if (D < 0) {
        msg = "固有値は複素数です (実表示なし)";
    } else {
        let l1 = (tr + Math.sqrt(D)) / 2;
        let l2 = (tr - Math.sqrt(D)) / 2;
        
        const calcVec = (lambda) => {
            let m11 = state.a - lambda;
            let m12 = state.b;
            let m21 = state.c;
            let m22 = state.d - lambda;
            const EPS = 1e-6;
            if (Math.abs(m12) > EPS || Math.abs(m11) > EPS) return { x: m12, y: -m11 };
            else if (Math.abs(m22) > EPS || Math.abs(m21) > EPS) return { x: m22, y: -m21 };
            else return { x: 1, y: 0 };
        };

        let v1 = calcVec(l1);
        let len1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
        if(len1 > 0) { v1.x /= len1; v1.y /= len1; }

        let v2 = calcVec(l2);
        let len2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
        if(len2 > 0) { v2.x /= len2; v2.y /= len2; }

        state.eigenValues = [l1, l2];
        state.eigenVectors = [v1, v2];

        msg = `$\\lambda_1 = ${l1.toFixed(2)}, \\boldsymbol{p}_1 \\approx \\binom{${v1.x.toFixed(2)}}{${v1.y.toFixed(2)}}$<br>` +
              `$\\lambda_2 = ${l2.toFixed(2)}, \\boldsymbol{p}_2 \\approx \\binom{${v2.x.toFixed(2)}}{${v2.y.toFixed(2)}}$`;
    }
    
    eigenInfo.innerHTML = msg;
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([eigenInfo]);
    }
}


// --- 座標変換・描画ヘルパー ---

function toScreen(x, y, zoom, pan) {
    let scale = GRID_SIZE * zoom;
    return { 
        x: x * scale + pan.x, 
        y: -y * scale + pan.y 
    };
}

function toMath(sx, sy, zoom, pan) {
    let scale = GRID_SIZE * zoom;
    return { 
        x: (sx - pan.x) / scale, 
        y: -(sy - pan.y) / scale 
    };
}

function applyMatToScreen(matrix, x, y, zoom, pan) {
    let nx = matrix.a * x + matrix.b * y;
    let ny = matrix.c * x + matrix.d * y;
    return toScreen(nx, ny, zoom, pan);
}

function getVisibleRange(p, zoom, pan) {
    // 画面の四隅の数学座標を計算
    // 左上: (-w/2, -h/2), 右下: (w/2, h/2)
    let p1 = toMath(-p.width/2, -p.height/2, zoom, pan);
    let p2 = toMath(p.width/2, -p.height/2, zoom, pan);
    let p3 = toMath(p.width/2, p.height/2, zoom, pan);
    let p4 = toMath(-p.width/2, p.height/2, zoom, pan);
    
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

// グリッド線
function drawGridLines(p, matrix, zoom, pan) {
    if (state.showEigen) return;

    p.strokeWeight(1);
    p.stroke(220); 
    
    let range = getVisibleRange(p, zoom, pan);

    if (matrix) {
        for (let i = range.xMin; i <= range.xMax; i++) {
            let p1 = applyMatToScreen(matrix, i, range.yMin, zoom, pan);
            let p2 = applyMatToScreen(matrix, i, range.yMax, zoom, pan);
            p.line(p1.x, p1.y, p2.x, p2.y);
        }
        for (let i = range.yMin; i <= range.yMax; i++) {
            let p1 = applyMatToScreen(matrix, range.xMin, i, zoom, pan);
            let p2 = applyMatToScreen(matrix, range.xMax, i, zoom, pan);
            p.line(p1.x, p1.y, p2.x, p2.y);
        }
    } else {
        for (let i = range.xMin; i <= range.xMax; i++) {
            let s = toScreen(i, 0, zoom, pan).x;
            p.line(s, -2000, s, 2000); 
        }
        for (let i = range.yMin; i <= range.yMax; i++) {
            let s = toScreen(0, i, zoom, pan).y;
            p.line(-2000, s, 2000, s);
        }
    }
}

// 軸と目盛り
function drawStandardAxes(p, zoom, pan) {
    let range = getVisibleRange(p, zoom, pan);
    
    p.stroke(0);
    p.strokeWeight(2);
    
    let xStart = toScreen(range.xMin, 0, zoom, pan);
    let xEnd = toScreen(range.xMax, 0, zoom, pan);
    p.line(xStart.x, xStart.y, xEnd.x, xEnd.y);
    drawAxisArrow(p, xStart, xEnd);

    let yStart = toScreen(0, range.yMin, zoom, pan);
    let yEnd = toScreen(0, range.yMax, zoom, pan);
    p.line(yStart.x, yStart.y, yEnd.x, yEnd.y);
    drawAxisArrow(p, yStart, yEnd);

    p.strokeWeight(1); 
    p.fill(0);
    p.textSize(10);
    
    let step = 1;
    if (zoom < 0.5) step = 2;
    if (zoom < 0.25) step = 5;
    if (zoom < 0.1) step = 10;

    p.textAlign(p.CENTER, p.TOP);
    for (let i = range.xMin; i <= range.xMax; i += step) {
        if (i === 0) continue;
        let s = toScreen(i, 0, zoom, pan);
        p.stroke(0); p.line(s.x, s.y - 3, s.x, s.y + 3);
        p.noStroke(); p.text(i, s.x, s.y + 5);
    }

    p.textAlign(p.RIGHT, p.MIDDLE);
    for (let i = range.yMin; i <= range.yMax; i += step) {
        if (i === 0) continue;
        let s = toScreen(0, i, zoom, pan);
        p.stroke(0); p.line(s.x - 3, s.y, s.x + 3, s.y);
        p.noStroke(); p.text(i, s.x - 5, s.y);
    }
}

function drawAxisArrow(p, start, end) {
    p.push();
    p.translate(end.x, end.y);
    let angle = Math.atan2(end.y - start.y, end.x - start.x);
    p.rotate(angle);
    p.fill(0); p.noStroke();
    let size = 10;
    p.triangle(0, 0, -size, size/2.5, -size, -size/2.5);
    p.pop();
}

function drawVector(p, x, y, col, label, isGhost, weight, zoom, pan) {
    p.push();
    if (isGhost) {
        p.stroke(col);
        p.strokeWeight(2);
        p.drawingContext.setLineDash([5, 5]);
    } else {
        p.stroke(col);
        p.strokeWeight(weight);
        p.drawingContext.setLineDash([]);
    }
    
    let origin = toScreen(0, 0, zoom, pan);
    let s = toScreen(x, y, zoom, pan);
    p.line(origin.x, origin.y, s.x, s.y);
    
    p.push();
    p.translate(s.x, s.y);
    p.rotate(Math.atan2(s.y - origin.y, s.x - origin.x)); 
    p.fill(isGhost ? 255 : col);
    if(isGhost) p.noFill();
    
    let arrowSize = weight * 2 + 2;
    p.triangle(0, 0, -arrowSize, arrowSize/2, -arrowSize, -arrowSize/2);
    p.pop();

    if (label) {
        p.noStroke(); p.fill(col); p.textSize(14);
        p.text(label, s.x + 10, s.y);
    }
    p.pop();
}

function drawUnitSquare(p, matrix, zoom, pan) {
    p.push();
    p.noStroke();
    p.fill(0, 0, 0, 20); 

    let p0, p1, p2, p3;
    if (matrix) {
        p0 = applyMatToScreen(matrix, 0, 0, zoom, pan);
        p1 = applyMatToScreen(matrix, 1, 0, zoom, pan);
        p2 = applyMatToScreen(matrix, 1, 1, zoom, pan);
        p3 = applyMatToScreen(matrix, 0, 1, zoom, pan);
    } else {
        p0 = toScreen(0, 0, zoom, pan);
        p1 = toScreen(1, 0, zoom, pan);
        p2 = toScreen(1, 1, zoom, pan);
        p3 = toScreen(0, 1, zoom, pan);
    }
    
    p.quad(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    p.pop();
}

function drawEigenGrid(p, matrix, zoom, pan) {
    if (!state.showEigen || state.eigenVectors.length < 2) return;
    
    p.stroke(255, 152, 0, 100); p.strokeWeight(1);

    let v1 = state.eigenVectors[0];
    let v2 = state.eigenVectors[1];
    
    if (matrix) {
        v1 = { x: v1.x * state.eigenValues[0], y: v1.y * state.eigenValues[0] };
        v2 = { x: v2.x * state.eigenValues[1], y: v2.y * state.eigenValues[1] };
    }

    let range = 20 + Math.ceil(20 / zoom); 
    for (let i = -range; i <= range; i++) {
        let startX = -range * v1.x + i * v2.x;
        let startY = -range * v1.y + i * v2.y;
        let endX = range * v1.x + i * v2.x;
        let endY = range * v1.y + i * v2.y;
        
        let p1 = toScreen(startX, startY, zoom, pan);
        let p2 = toScreen(endX, endY, zoom, pan);
        p.line(p1.x, p1.y, p2.x, p2.y);

        startX = i * v1.x - range * v2.x;
        startY = i * v1.y - range * v2.y;
        endX = i * v1.x + range * v2.x;
        endY = i * v1.y + range * v2.y;
        
        p1 = toScreen(startX, startY, zoom, pan);
        p2 = toScreen(endX, endY, zoom, pan);
        p.line(p1.x, p1.y, p2.x, p2.y);
    }
}

function drawEigenVectors(p, matrix, zoom, pan) {
    if (!state.showEigen || state.eigenVectors.length < 2) return;

    let v1 = state.eigenVectors[0];
    let v2 = state.eigenVectors[1];
    let label1 = "p1", label2 = "p2";

    if (matrix) {
        v1 = { x: v1.x * state.eigenValues[0], y: v1.y * state.eigenValues[0] };
        v2 = { x: v2.x * state.eigenValues[1], y: v2.y * state.eigenValues[1] };
        label1 = "Ap1"; label2 = "Ap2";
    }

    drawVector(p, v1.x, v1.y, '#E65100', label1, false, 3, zoom, pan);
    drawVector(p, v2.x, v2.y, '#E65100', label2, false, 3, zoom, pan);
}

function drawCharacter(p, zoom, pan) {
    p.push();
    let origin = toScreen(0, 0, zoom, pan);
    p.translate(origin.x, origin.y);
    let s = GRID_SIZE * zoom;
    p.scale(s, -s); 
    
    p.fill(255, 235, 59, 200); p.stroke(0); p.strokeWeight(2 / s); 
    p.ellipse(0.5, 0.5, 1, 1);
    p.fill(0);
    p.ellipse(0.35, 0.6, 0.1, 0.1);
    p.ellipse(0.65, 0.6, 0.1, 0.1);
    p.noFill();
    p.arc(0.5, 0.45, 0.5, 0.3, p.PI, p.TWO_PI);
    p.pop();
}


// --- 左図: 定義域 ---
const sketchLeft = (p) => {
    let isDraggingVector = false;
    let isPanning = false;
    let dragStart = { x: 0, y: 0 };
    let panStart = { x: 0, y: 0 };

    p.setup = () => {
        let container = document.getElementById('canvas-left-holder');
        p.createCanvas(container.clientWidth, 400);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2);

        let z = state.zoomLeft;
        let pan = state.panLeft;

        drawEigenGrid(p, null, z, pan);
        drawGridLines(p, null, z, pan);
        drawStandardAxes(p, z, pan);
        
        drawUnitSquare(p, null, z, pan); 
        drawCharacter(p, z, pan);
        drawEigenVectors(p, null, z, pan);

        if (!state.showEigen) {
            drawVector(p, 1, 0, '#1565C0', 'e1', false, 3, z, pan);
            drawVector(p, 0, 1, '#C62828', 'e2', false, 3, z, pan);
        }

        drawVector(p, state.vx, state.vy, '#43A047', 'x', false, 3, z, pan);
        
        let s = toScreen(state.vx, state.vy, z, pan);
        p.fill(255); p.stroke('#43A047'); p.strokeWeight(2);
        if (p.dist(p.mouseX - p.width/2, p.mouseY - p.height/2, s.x, s.y) < 10) {
            p.fill('#43A047');
            p.cursor('move');
        } else {
            p.cursor('default');
        }
        p.circle(s.x, s.y, 10);
    };

    p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        let z = state.zoomLeft;
        let pan = state.panLeft;
        
        let s = toScreen(state.vx, state.vy, z, pan);
        if (p.dist(mx, my, s.x, s.y) < 20) {
            isDraggingVector = true;
        } else {
            isPanning = true;
            dragStart = { x: mx, y: my };
            panStart = { x: state.panLeft.x, y: state.panLeft.y };
        }
    };

    p.mouseDragged = () => {
        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        let z = state.zoomLeft;
        let pan = state.panLeft;

        if (isDraggingVector) {
            let m = toMath(mx, my, z, pan);
            updateVector(m.x, m.y);
        } else if (isPanning) {
            state.panLeft.x = panStart.x + (mx - dragStart.x);
            state.panLeft.y = panStart.y + (my - dragStart.y);
        }
    };
    
    p.mouseReleased = () => { 
        isDraggingVector = false; 
        isPanning = false; 
    };
    
    p.mouseWheel = (e) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            let mx = p.mouseX - p.width/2;
            let my = p.mouseY - p.height/2;
            let mathPos = toMath(mx, my, state.zoomLeft, state.panLeft);

            let sensitivity = 0.001; 
            let factor = Math.exp(-e.delta * sensitivity); 
            let newZoom = state.zoomLeft * factor;
            newZoom = Math.max(0.1, Math.min(20.0, newZoom));

            state.panLeft.x = mx - mathPos.x * GRID_SIZE * newZoom;
            state.panLeft.y = my - (-mathPos.y * GRID_SIZE * newZoom);
            state.zoomLeft = newZoom;
            
            return false;
        }
        return true;
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-left-holder');
        p.resizeCanvas(container.clientWidth, 400);
    };
};


// --- 右図: 値域 ---
const sketchRight = (p) => {
    let dragTarget = null; // 'e1', 'e2', or 'pan'
    let dragStart = { x: 0, y: 0 };
    let panStart = { x: 0, y: 0 };

    p.setup = () => {
        let container = document.getElementById('canvas-right-holder');
        p.createCanvas(container.clientWidth, 400);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2);

        let z = state.zoomRight;
        let pan = state.panRight;
        let mat = {a:state.a, b:state.b, c:state.c, d:state.d};

        drawEigenGrid(p, mat, z, pan);
        drawGridLines(p, mat, z, pan);
        drawStandardAxes(p, z, pan); 

        drawUnitSquare(p, mat, z, pan); 

        p.push();
        let origin = toScreen(0, 0, z, pan);
        p.translate(origin.x, origin.y);
        let s = GRID_SIZE * z;
        p.scale(s, -s);
        p.applyMatrix(state.a, state.c, state.b, state.d, 0, 0);
        {
            p.fill(255, 235, 59, 200); p.stroke(0); p.strokeWeight(2 / s); 
            p.ellipse(0.5, 0.5, 1, 1);
            p.fill(0);
            p.ellipse(0.35, 0.6, 0.1, 0.1); p.ellipse(0.65, 0.6, 0.1, 0.1);
            p.noFill(); p.arc(0.5, 0.45, 0.5, 0.3, p.PI, p.TWO_PI);
        }
        p.pop();

        drawEigenVectors(p, mat, z, pan);

        if (!state.showEigen) {
            drawVector(p, 1, 0, 'rgba(21, 101, 192, 0.2)', '', true, 3, z, pan);
            drawVector(p, 0, 1, 'rgba(198, 40, 40, 0.2)', '', true, 3, z, pan);
        }

        drawVector(p, state.vx, state.vy, 'rgba(46, 125, 50, 0.3)', '', true, 3, z, pan);

        if (!state.showEigen) {
            drawVector(p, state.a, state.c, '#1565C0', 'Ae1', false, 3, z, pan);
            drawVector(p, state.b, state.d, '#C62828', 'Ae2', false, 3, z, pan);
        }

        let ax = state.a * state.vx + state.b * state.vy;
        let ay = state.c * state.vx + state.d * state.vy;
        drawVector(p, ax, ay, '#2E7D32', 'Ax', false, 3, z, pan);

        if (!state.showEigen) {
            drawHandle(p, state.a, state.c, '#1565C0', z, pan);
            drawHandle(p, state.b, state.d, '#C62828', z, pan);
        }
    };

    function drawHandle(p, x, y, col, zoom, pan) {
        let s = toScreen(x, y, zoom, pan);
        p.fill(255); p.stroke(col); p.strokeWeight(2);
        if (p.dist(p.mouseX - p.width/2, p.mouseY - p.height/2, s.x, s.y) < 10) {
            p.fill(col);
            p.cursor('move');
        }
        p.circle(s.x, s.y, 10);
    }

    p.mousePressed = () => {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        let z = state.zoomRight;
        let pan = state.panRight;

        if (!state.showEigen) {
            let s1 = toScreen(state.a, state.c, z, pan);
            let s2 = toScreen(state.b, state.d, z, pan);
            
            if (p.dist(mx, my, s1.x, s1.y) < 15) {
                dragTarget = 'e1';
                return;
            } else if (p.dist(mx, my, s2.x, s2.y) < 15) {
                dragTarget = 'e2';
                return;
            }
        }
        
        dragTarget = 'pan';
        dragStart = { x: mx, y: my };
        panStart = { x: state.panRight.x, y: state.panRight.y };
    };

    p.mouseDragged = () => {
        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        let z = state.zoomRight;
        let pan = state.panRight;

        if (dragTarget === 'e1') {
            let m = toMath(mx, my, z, pan);
            updateMatrixFromDrag(m.x, state.b, m.y, state.d);
        } else if (dragTarget === 'e2') {
            let m = toMath(mx, my, z, pan);
            updateMatrixFromDrag(state.a, m.x, state.c, m.y);
        } else if (dragTarget === 'pan') {
            state.panRight.x = panStart.x + (mx - dragStart.x);
            state.panRight.y = panStart.y + (my - dragStart.y);
        }
    };

    p.mouseReleased = () => { dragTarget = null; p.cursor('default'); };
    
    p.mouseWheel = (e) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            let mx = p.mouseX - p.width/2;
            let my = p.mouseY - p.height/2;
            let mathPos = toMath(mx, my, state.zoomRight, state.panRight);

            let sensitivity = 0.001; 
            let factor = Math.exp(-e.delta * sensitivity); 
            let newZoom = state.zoomRight * factor;
            newZoom = Math.max(0.1, Math.min(20.0, newZoom));

            state.panRight.x = mx - mathPos.x * GRID_SIZE * newZoom;
            state.panRight.y = my - (-mathPos.y * GRID_SIZE * newZoom);
            state.zoomRight = newZoom;
            
            return false;
        }
        return true;
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-right-holder');
        p.resizeCanvas(container.clientWidth, 400);
    };
};