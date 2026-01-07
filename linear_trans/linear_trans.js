/**
 * 線形変換シミュレーター
 * 左: 定義域 (Domain), 右: 値域 (Range)
 */

// グローバル状態
const state = {
    // 行列 A = [[a, b], [c, d]]
    // デフォルト値: a=2, b=1, c=0, d=3
    a: 2, b: 1,
    c: 0, d: 3,
    
    // 入力ベクトル x = [vx, vy]
    vx: 1, vy: 1,
    
    // UI状態
    showEigen: false,
    zoom: 1.0, // ズーム倍率
    
    // 計算結果キャッシュ
    eigenValues: [],
    eigenVectors: []
};

// UI要素
let inputA, inputB, inputC, inputD;
let sliderA, sliderB, sliderC, sliderD;
let checkEigen, eigenInfo;
let vectorInfoBar;

// p5インスタンス
let p5Left, p5Right;

// 定数
const GRID_SIZE = 40; // グリッドの基本ピクセルサイズ
const AXIS_RANGE = 20; // 描画するグリッドの範囲

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

    checkEigen = document.getElementById('checkEigen');
    eigenInfo = document.getElementById('eigen-info');
    vectorInfoBar = document.getElementById('vector-info-bar');

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

    // 初回計算
    updateAll();

    // p5.js 開始
    p5Left = new p5(sketchLeft, 'canvas-left-holder');
    p5Right = new p5(sketchRight, 'canvas-right-holder');
});

// 全更新処理
function updateAll() {
    calcEigen();
    updateDisplayValues();
}

// 行列の更新 (右図のドラッグ操作から呼ばれる)
function updateMatrixFromDrag(newA, newB, newC, newD) {
    state.a = newA; state.b = newB;
    state.c = newC; state.d = newD;
    
    // 入力欄・スライダー更新
    const updateUI = (el, sl, val) => {
        el.value = val.toFixed(2);
        sl.value = val;
    };
    updateUI(inputA, sliderA, state.a);
    updateUI(inputB, sliderB, state.b);
    updateUI(inputC, sliderC, state.c);
    updateUI(inputD, sliderD, state.d);
    
    updateAll();
}

// ベクトルの更新 (左図のドラッグ操作から呼ばれる)
function updateVector(nx, ny) {
    state.vx = nx;
    state.vy = ny;
    updateDisplayValues();
}

// 数値表示の更新 (LaTeX生成)
function updateDisplayValues() {
    let ax = state.a * state.vx + state.b * state.vy;
    let ay = state.c * state.vx + state.d * state.vy;

    const latex = `
        \\text{入力 } \\vec{x} = \\begin{pmatrix} ${state.vx.toFixed(2)} \\\\ ${state.vy.toFixed(2)} \\end{pmatrix}
        \\quad \\xrightarrow{A} \\quad
        \\text{出力 } A\\vec{x} = \\begin{pmatrix} ${ax.toFixed(2)} \\\\ ${ay.toFixed(2)} \\end{pmatrix}
    `;

    vectorInfoBar.innerHTML = `$$ ${latex} $$`;

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([vectorInfoBar]);
    }
}

// 固有値・固有ベクトルの計算
function calcEigen() {
    let tr = state.a + state.d;
    let det = state.a * state.d - state.b * state.c;
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

        msg = `$\\lambda_1 = ${l1.toFixed(2)}, \\vec{p}_1 \\approx \\binom{${v1.x.toFixed(2)}}{${v1.y.toFixed(2)}}$<br>` +
              `$\\lambda_2 = ${l2.toFixed(2)}, \\vec{p}_2 \\approx \\binom{${v2.x.toFixed(2)}}{${v2.y.toFixed(2)}}$`;
    }
    
    eigenInfo.innerHTML = msg;
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([eigenInfo]);
    }
}


// --- 共通描画関数 ---

// 数学座標(x, y)をスクリーン座標(sx, sy)に変換するヘルパー
function toScreen(x, y) {
    let scale = GRID_SIZE * state.zoom;
    return { x: x * scale, y: -y * scale }; // y軸反転
}

// スクリーン座標から数学座標へ
function toMath(sx, sy) {
    let scale = GRID_SIZE * state.zoom;
    return { x: sx / scale, y: -sy / scale };
}

// 数学座標系での行列適用 -> スクリーン座標を返す
function applyMatToScreen(matrix, x, y) {
    let nx = matrix.a * x + matrix.b * y;
    let ny = matrix.c * x + matrix.d * y;
    return toScreen(nx, ny);
}

// グリッド線（薄い線）の描画
function drawGridLines(p, matrix = null) {
    if (state.showEigen) return;

    p.strokeWeight(1);
    p.stroke(220); 
    
    let range = Math.ceil(AXIS_RANGE / state.zoom); 

    if (matrix) {
        // 行列によって歪んだグリッド
        for (let i = -range; i <= range; i++) {
            let p1 = applyMatToScreen(matrix, i, -range);
            let p2 = applyMatToScreen(matrix, i, range);
            p.line(p1.x, p1.y, p2.x, p2.y);
        }
        for (let i = -range; i <= range; i++) {
            let p1 = applyMatToScreen(matrix, -range, i);
            let p2 = applyMatToScreen(matrix, range, i);
            p.line(p1.x, p1.y, p2.x, p2.y);
        }
    } else {
        // 標準グリッド
        for (let i = -range; i <= range; i++) {
            let s = toScreen(i, 0).x;
            p.line(s, -p.height, s, p.height);
        }
        for (let i = -range; i <= range; i++) {
            let s = toScreen(0, i).y;
            p.line(-p.width, s, p.width, s);
        }
    }
}

// 標準軸・目盛り・数値の描画（常に固定）
function drawStandardAxes(p) {
    let range = Math.ceil(AXIS_RANGE / state.zoom);
    
    // 軸（太い黒線）
    p.stroke(0);
    p.strokeWeight(2);
    
    // X軸
    let xStart = toScreen(-range, 0);
    let xEnd = toScreen(range, 0);
    p.line(xStart.x, xStart.y, xEnd.x, xEnd.y);
    drawAxisArrow(p, xStart, xEnd);

    // Y軸
    let yStart = toScreen(0, -range);
    let yEnd = toScreen(0, range);
    p.line(yStart.x, yStart.y, yEnd.x, yEnd.y);
    drawAxisArrow(p, yStart, yEnd);

    // 目盛りと数値
    p.strokeWeight(1); // 目盛りは細く
    p.fill(0);
    p.textSize(10);
    
    // ステップ調整（ズームしすぎたときに数字が重ならないように）
    let step = 1;
    if (state.zoom < 0.5) step = 2;
    if (state.zoom < 0.25) step = 5;
    if (state.zoom < 0.1) step = 10;

    // X軸目盛り
    p.textAlign(p.CENTER, p.TOP);
    for (let i = -range; i <= range; i += step) {
        if (i === 0) continue;
        let s = toScreen(i, 0);
        // 目盛り線
        p.stroke(0);
        p.line(s.x, s.y - 3, s.x, s.y + 3);
        // 数値
        p.noStroke();
        p.text(i, s.x, s.y + 5);
    }

    // Y軸目盛り
    p.textAlign(p.RIGHT, p.MIDDLE);
    for (let i = -range; i <= range; i += step) {
        if (i === 0) continue;
        let s = toScreen(0, i);
        // 目盛り線
        p.stroke(0);
        p.line(s.x - 3, s.y, s.x + 3, s.y);
        // 数値
        p.noStroke();
        p.text(i, s.x - 5, s.y);
    }
}

// 軸の先端に矢印を描画
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

// ベクトル描画
function drawVector(p, x, y, col, label, isGhost = false, weight = 3) {
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
    
    let s = toScreen(x, y);
    p.line(0, 0, s.x, s.y);
    
    p.push();
    p.translate(s.x, s.y);
    p.rotate(Math.atan2(s.y, s.x)); 
    p.fill(isGhost ? 255 : col);
    if(isGhost) p.noFill();
    
    let arrowSize = weight * 2 + 2;
    p.triangle(0, 0, -arrowSize, arrowSize/2, -arrowSize, -arrowSize/2);
    p.pop();

    if (label) {
        p.noStroke();
        p.fill(col);
        p.textSize(14);
        p.text(label, s.x + 10, s.y);
    }
    p.pop();
}

// 固有空間グリッド描画
function drawEigenGrid(p, matrix = null) {
    if (!state.showEigen || state.eigenVectors.length < 2) return;
    
    p.stroke(255, 152, 0, 100); 
    p.strokeWeight(1);

    let v1 = state.eigenVectors[0];
    let v2 = state.eigenVectors[1];
    
    if (matrix) {
        v1 = { x: v1.x * state.eigenValues[0], y: v1.y * state.eigenValues[0] };
        v2 = { x: v2.x * state.eigenValues[1], y: v2.y * state.eigenValues[1] };
    }

    let range = 10;
    for (let i = -range; i <= range; i++) {
        let startX = -range * v1.x + i * v2.x;
        let startY = -range * v1.y + i * v2.y;
        let endX = range * v1.x + i * v2.x;
        let endY = range * v1.y + i * v2.y;
        
        let p1 = toScreen(startX, startY);
        let p2 = toScreen(endX, endY);
        p.line(p1.x, p1.y, p2.x, p2.y);

        startX = i * v1.x - range * v2.x;
        startY = i * v1.y - range * v2.y;
        endX = i * v1.x + range * v2.x;
        endY = i * v1.y + range * v2.y;
        
        p1 = toScreen(startX, startY);
        p2 = toScreen(endX, endY);
        p.line(p1.x, p1.y, p2.x, p2.y);
    }
}

// 固有ベクトルの描画
function drawEigenVectors(p, matrix = null) {
    if (!state.showEigen || state.eigenVectors.length < 2) return;

    let v1 = state.eigenVectors[0];
    let v2 = state.eigenVectors[1];
    let label1 = "p1", label2 = "p2";

    if (matrix) {
        v1 = { x: v1.x * state.eigenValues[0], y: v1.y * state.eigenValues[0] };
        v2 = { x: v2.x * state.eigenValues[1], y: v2.y * state.eigenValues[1] };
        label1 = "Ap1"; label2 = "Ap2";
    }

    drawVector(p, v1.x, v1.y, '#E65100', label1, false, 3);
    drawVector(p, v2.x, v2.y, '#E65100', label2, false, 3);
}

// キャラクター(顔)の描画
function drawCharacter(p) {
    p.push();
    let scale = GRID_SIZE * state.zoom;
    
    // スケーリング
    p.scale(scale, -scale); 
    
    // 顔の輪郭
    p.fill(255, 235, 59, 200); 
    p.stroke(0);
    p.strokeWeight(2 / scale); 
    p.ellipse(0.5, 0.5, 1, 1);
    
    // 目
    p.fill(0);
    p.ellipse(0.35, 0.6, 0.1, 0.1);
    p.ellipse(0.65, 0.6, 0.1, 0.1);
    
    // 口 (笑顔: PI ~ TWO_PI)
    p.noFill();
    p.arc(0.5, 0.45, 0.5, 0.3, p.PI, p.TWO_PI);
    
    p.pop();
}


// --- 左図: 定義域 ---
const sketchLeft = (p) => {
    let isDragging = false;

    p.setup = () => {
        let container = document.getElementById('canvas-left-holder');
        p.createCanvas(container.clientWidth, 400);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2);

        drawEigenGrid(p);
        drawGridLines(p);
        drawStandardAxes(p); // 常に標準軸を表示
        
        drawCharacter(p);
        drawEigenVectors(p);

        // 基底ベクトル
        if (!state.showEigen) {
            drawVector(p, 1, 0, '#1565C0', 'e1');
            drawVector(p, 0, 1, '#C62828', 'e2');
        }

        // 入力ベクトル x (薄い緑っぽい色)
        drawVector(p, state.vx, state.vy, '#43A047', 'x');
        
        // ハンドル
        let s = toScreen(state.vx, state.vy);
        p.fill(255); p.stroke('#43A047'); p.strokeWeight(2);
        if (p.dist(p.mouseX - p.width/2, p.mouseY - p.height/2, s.x, s.y) < 10) {
            p.fill('#43A047');
            p.cursor('move');
        } else {
            p.cursor('default');
        }
        p.circle(s.x, s.y, 10);
    };

    p.mouseDragged = () => {
        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        let s = toScreen(state.vx, state.vy);
        
        if (p.dist(mx, my, s.x, s.y) < 20 || isDragging) {
            isDragging = true;
            let m = toMath(mx, my);
            updateVector(m.x, m.y);
        }
    };
    
    p.mouseReleased = () => { isDragging = false; };
    
    // マウスがキャンバス上にあるときだけズーム
    p.mouseWheel = (e) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            state.zoom = Math.max(0.1, Math.min(5.0, state.zoom - e.delta * 0.001));
            return false; // ページスクロール阻止
        }
        return true; // ページスクロール許可
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-left-holder');
        p.resizeCanvas(container.clientWidth, 400);
    };
};


// --- 右図: 値域 ---
const sketchRight = (p) => {
    let dragTarget = null;

    p.setup = () => {
        let container = document.getElementById('canvas-right-holder');
        p.createCanvas(container.clientWidth, 400);
    };

    p.draw = () => {
        p.background(255);
        p.translate(p.width / 2, p.height / 2);

        let mat = {a:state.a, b:state.b, c:state.c, d:state.d};

        drawEigenGrid(p, mat);
        drawGridLines(p, mat);
        drawStandardAxes(p); // 常に標準軸を表示

        // 変形したキャラクター
        p.push();
        p.applyMatrix(state.a, state.c, state.b, state.d, 0, 0);
        drawCharacter(p);
        p.pop();

        drawEigenVectors(p, mat);

        // 変換前の基底ベクトル (Ghost)
        if (!state.showEigen) {
            drawVector(p, 1, 0, 'rgba(21, 101, 192, 0.2)', '', true);
            drawVector(p, 0, 1, 'rgba(198, 40, 40, 0.2)', '', true);
        }

        // 入力ベクトル x (Ghost)
        drawVector(p, state.vx, state.vy, 'rgba(46, 125, 50, 0.3)', '', true);

        // 変換後の基底ベクトル Ae1, Ae2
        if (!state.showEigen) {
            drawVector(p, state.a, state.c, '#1565C0', 'Ae1');
            drawVector(p, state.b, state.d, '#C62828', 'Ae2');
        }

        // 出力ベクトル Ax
        let ax = state.a * state.vx + state.b * state.vy;
        let ay = state.c * state.vx + state.d * state.vy;
        drawVector(p, ax, ay, '#2E7D32', 'Ax');

        // ハンドル (Ae1, Ae2)
        if (!state.showEigen) {
            drawHandle(p, state.a, state.c, '#1565C0');
            drawHandle(p, state.b, state.d, '#C62828');
        }
    };

    function drawHandle(p, x, y, col) {
        let s = toScreen(x, y);
        p.fill(255); p.stroke(col); p.strokeWeight(2);
        if (p.dist(p.mouseX - p.width/2, p.mouseY - p.height/2, s.x, s.y) < 10) {
            p.fill(col);
            p.cursor('move');
        }
        p.circle(s.x, s.y, 10);
    }

    p.mouseDragged = () => {
        if (state.showEigen) return;

        let mx = p.mouseX - p.width/2;
        let my = p.mouseY - p.height/2;
        
        let m = toMath(mx, my);

        if (!dragTarget) {
            let s1 = toScreen(state.a, state.c);
            let s2 = toScreen(state.b, state.d);
            
            let d1 = p.dist(mx, my, s1.x, s1.y);
            let d2 = p.dist(mx, my, s2.x, s2.y);
            
            if (d1 < 15) dragTarget = 'e1';
            else if (d2 < 15) dragTarget = 'e2';
        }

        if (dragTarget === 'e1') {
            updateMatrixFromDrag(m.x, state.b, m.y, state.d);
        } else if (dragTarget === 'e2') {
            updateMatrixFromDrag(state.a, m.x, state.c, m.y);
        }
    };

    p.mouseReleased = () => { dragTarget = null; p.cursor('default'); };
    
    // マウスがキャンバス上にあるときだけズーム
    p.mouseWheel = (e) => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
            state.zoom = Math.max(0.1, Math.min(5.0, state.zoom - e.delta * 0.001));
            return false;
        }
        return true;
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas-right-holder');
        p.resizeCanvas(container.clientWidth, 400);
    };
};