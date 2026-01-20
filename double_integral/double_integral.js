/**
 * 重積分シミュレーター
 */

// シミュレーション状態
const state = {
    funcId: 'parabola',
    viewMode: 'riemann', // 'riemann', 'sliceX', 'sliceY'
    sliceType: 'single', // 'single' (断面のみ), 'sum' (板の総和)
    
    // 積分領域
    xMin: -2, xMax: 2,
    yMin: -2, yMax: 2,
    
    // 分割数
    nx: 10, ny: 10,
    
    // スライス位置 (0.0 ~ 1.0)
    slicePos: 0.5, 
    
    // 計算結果
    approxVol: 0,
    exactVol: 0
};

// 関数定義
const functions = {
    'parabola': {
        f: (x, y) => x*x + y*y,
        F: (x, y) => (x * y * (x*x + y*y)) / 3,
        label: "z = x^2 + y^2",
        latex: "x^2 + y^2"
    },
    'sin_cos': {
        f: (x, y) => Math.sin(x) + Math.cos(y) + 2,
        F: (x, y) => -y*Math.cos(x) + x*Math.sin(y) + 2*x*y,
        label: "z = sin(x) + cos(y) + 2",
        latex: "\\sin x + \\cos y + 2"
    },
    'plane': {
        f: (x, y) => 0.5*x + 0.5*y + 1,
        F: (x, y) => 0.25*x*x*y + 0.25*x*y*y + x*y,
        label: "z = 0.5x + 0.5y + 1",
        latex: "0.5x + 0.5y + 1"
    },
    'dome': {
        f: (x, y) => {
            let val = 16 - x*x - y*y;
            return val > 0 ? Math.sqrt(val) : 0;
        },
        useNumerical: true, 
        label: "z = sqrt(16 - x^2 - y^2)",
        latex: "\\sqrt{16 - x^2 - y^2}"
    }
};

// UI要素
let funcSelect, modeRadios, sliceTypeRadios;
let sliderSlice, valSlice, sliceLabel, slicePosContainer;
let sliderNx, sliderNy, valNx, valNy;
let sliceGroup, riemannGroup;
let resApprox, resExact, approxResBox;
let dynamicMathDiv, mathTitle;

// p5インスタンス
let sketchP5;

// 定数
const SCALE = 40; 

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    funcSelect = document.getElementById('func-select');
    modeRadios = document.querySelectorAll('input[name="viewMode"]');
    sliceTypeRadios = document.querySelectorAll('input[name="sliceType"]');
    
    sliderSlice = document.getElementById('slider-slice');
    valSlice = document.getElementById('val-slice');
    sliceLabel = document.getElementById('slice-label');
    sliceGroup = document.getElementById('slice-control-group');
    slicePosContainer = document.getElementById('slice-pos-container');
    
    sliderNx = document.getElementById('slider-nx'); valNx = document.getElementById('val-nx');
    sliderNy = document.getElementById('slider-ny'); valNy = document.getElementById('val-ny');
    riemannGroup = document.getElementById('riemann-control-group');
    
    resApprox = document.getElementById('res-approx');
    resExact = document.getElementById('res-exact');
    approxResBox = document.getElementById('approx-res-box');
    
    dynamicMathDiv = document.getElementById('dynamic-math');
    mathTitle = document.getElementById('math-title');

    // イベント設定
    if (funcSelect) {
        funcSelect.addEventListener('change', () => {
            state.funcId = funcSelect.value;
            updateCalculation();
        });
    }

    if (modeRadios.length > 0) {
        modeRadios.forEach(r => {
            r.addEventListener('change', () => {
                if(r.checked) state.viewMode = r.value;
                updateUI();
                updateCalculation();
            });
        });
    }

    if (sliceTypeRadios.length > 0) {
        sliceTypeRadios.forEach(r => {
            r.addEventListener('change', () => {
                if(r.checked) state.sliceType = r.value;
                updateUI();
                updateMathJax();
            });
        });
    }

    if (sliderSlice) {
        sliderSlice.addEventListener('input', () => {
            state.slicePos = parseInt(sliderSlice.value) / 100.0;
            updateSliceValDisplay();
            updateMathJax(); 
        });
    }

    if (sliderNx) {
        sliderNx.addEventListener('input', () => {
            state.nx = parseInt(sliderNx.value);
            valNx.textContent = state.nx;
            updateCalculation();
        });
    }
    
    if (sliderNy) {
        sliderNy.addEventListener('input', () => {
            state.ny = parseInt(sliderNy.value);
            valNy.textContent = state.ny;
            updateCalculation();
        });
    }

    updateUI();
    updateCalculation();

    try {
        new p5(sketch, 'canvas-holder');
    } catch (e) {
        console.error("p5.js initialization failed:", e);
        document.getElementById('canvas-holder').innerHTML = 
            "<p style='color:red; padding:20px;'>WebGLの初期化に失敗しました。<br>Chromeの場合: 設定 > システム > ハードウェアアクセラレーション をONにしてください。</p>";
    }
});

function updateSliceValDisplay() {
    if (!valSlice || !sliceLabel) return;
    let val;
    if (state.viewMode === 'sliceX') { // yを固定
        val = state.yMin + state.slicePos * (state.yMax - state.yMin);
        sliceLabel.textContent = "切断面の位置 (y):";
    } else { // xを固定
        val = state.xMin + state.slicePos * (state.xMax - state.xMin);
        sliceLabel.textContent = "切断面の位置 (x):";
    }
    valSlice.textContent = val.toFixed(2);
}

function updateUI() {
    if (!riemannGroup || !sliceGroup || !approxResBox || !mathTitle) return;
    
    if (state.viewMode === 'riemann') {
        riemannGroup.style.display = 'flex';
        sliceGroup.style.display = 'none';
        approxResBox.style.display = 'block';
        mathTitle.textContent = "区分求積法 (リーマン和)";
    } else {
        riemannGroup.style.display = 'flex'; 
        sliceGroup.style.display = 'flex';
        
        if (state.sliceType === 'sum') {
            slicePosContainer.style.display = 'none'; 
            approxResBox.style.display = 'block'; 
        } else {
            slicePosContainer.style.display = 'block';
            approxResBox.style.display = 'none'; 
        }

        mathTitle.textContent = state.viewMode === 'sliceX' ? 
            "xで先に積分 (y固定)" : "yで先に積分 (x固定)";
        updateSliceValDisplay();
    }
}

function updateCalculation() {
    const funcData = functions[state.funcId];
    
    // 近似体積計算
    const dx = (state.xMax - state.xMin) / state.nx;
    const dy = (state.yMax - state.yMin) / state.ny;
    let sum = 0;
    
    for (let i = 0; i < state.nx; i++) {
        for (let j = 0; j < state.ny; j++) {
            let x = state.xMin + i * dx; 
            let y = state.yMin + j * dy; 
            let z = funcData.f(x, y);
            sum += z * dx * dy;
        }
    }
    state.approxVol = sum;
    if(resApprox) resApprox.textContent = sum.toFixed(4);

    // 厳密体積
    if (funcData.useNumerical) {
        let nDetailed = 100;
        let ddx = (state.xMax - state.xMin) / nDetailed;
        let ddy = (state.yMax - state.yMin) / nDetailed;
        let exactSum = 0;
        for(let i=0; i<nDetailed; i++){
            for(let j=0; j<nDetailed; j++){
                let xx = state.xMin + i*ddx + ddx/2;
                let yy = state.yMin + j*ddy + ddy/2;
                exactSum += funcData.f(xx, yy) * ddx * ddy;
            }
        }
        state.exactVol = exactSum;
    } else {
        const F = funcData.F;
        const x1 = state.xMin, x2 = state.xMax;
        const y1 = state.yMin, y2 = state.yMax;
        state.exactVol = F(x2, y2) - F(x1, y2) - F(x2, y1) + F(x1, y1);
    }
    if(resExact) resExact.textContent = state.exactVol.toFixed(4);

    updateMathJax();
}

function updateMathJax() {
    if (!dynamicMathDiv) return;
    const funcData = functions[state.funcId];
    let tex = "";

    const dx = (state.xMax - state.xMin) / state.nx;
    const dy = (state.yMax - state.yMin) / state.ny;

    if (state.viewMode === 'riemann') {
        tex = `V \\approx \\sum_{i,j} f(x_i, y_j) \\Delta x \\Delta y \\quad (\\Delta x=${dx.toFixed(2)}, \\Delta y=${dy.toFixed(2)})`;
    } else if (state.viewMode === 'sliceX') {
        if (state.sliceType === 'single') {
            let yVal = state.yMin + state.slicePos * (state.yMax - state.yMin);
            tex = `\\text{断面積 } S(y) = \\int_{${state.xMin}}^{${state.xMax}} f(x, y) dx \\quad (y=${yVal.toFixed(2)})`;
        } else {
            tex = `V \\approx \\sum_{j} S(y_j) \\Delta y \\quad (\\Delta y=${dy.toFixed(2)})`;
        }
    } else {
        if (state.sliceType === 'single') {
            let xVal = state.xMin + state.slicePos * (state.xMax - state.xMin);
            tex = `\\text{断面積 } S(x) = \\int_{${state.yMin}}^{${state.yMax}} f(x, y) dy \\quad (x=${xVal.toFixed(2)})`;
        } else {
            tex = `V \\approx \\sum_{i} S(x_i) \\Delta x \\quad (\\Delta x=${dx.toFixed(2)})`;
        }
    }

    dynamicMathDiv.innerHTML = `$$ ${tex} $$`;
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([dynamicMathDiv]);
    }
}


// --- p5.js 3D Sketch ---
const sketch = (p) => {
    p.setup = () => {
        let container = document.getElementById('canvas-holder');
        let w = container.clientWidth || 600;
        let h = container.clientHeight || 500;
        
        p.createCanvas(w, h, p.WEBGL);
        
        let cam = p.createCamera();
        cam.setPosition(400, -300, 400); 
        cam.lookAt(0, 0, 0);
        p.setCamera(cam);
    };

    p.draw = () => {
        p.background(250);
        
        p.ambientLight(150);
        p.directionalLight(255, 255, 255, 0.5, 1, -0.5);

        // マウスがキャンバス上にあるときのみ orbitControl を有効化
        if (isMouseOverCanvas(p)) {
            p.orbitControl();
        }

        drawAxes(p);

        const funcData = functions[state.funcId];
        
        drawSurface(p, funcData.f);

        if (state.viewMode === 'riemann') {
            drawRiemannBoxes(p, funcData.f);
        } else if (state.viewMode === 'sliceX') {
            if (state.sliceType === 'single') {
                let yVal = state.yMin + state.slicePos * (state.yMax - state.yMin);
                drawSingleSliceX(p, funcData.f, yVal);
            } else {
                drawAllSlicesX(p, funcData.f);
            }
        } else if (state.viewMode === 'sliceY') {
            if (state.sliceType === 'single') {
                let xVal = state.xMin + state.slicePos * (state.xMax - state.xMin);
                drawSingleSliceY(p, funcData.f, xVal);
            } else {
                drawAllSlicesY(p, funcData.f);
            }
        }
    };

    // キャンバス上にマウスがあるか判定
    function isMouseOverCanvas(p) {
        return (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height);
    }

    function mapP5(x, y, z) {
        return p.createVector(x * SCALE, -z * SCALE, -y * SCALE); 
    }

    function drawAxes(p) {
        p.strokeWeight(1);
        const len = 250;
        p.stroke(255, 0, 0);
        let x1 = mapP5(-len/SCALE, 0, 0);
        let x2 = mapP5(len/SCALE, 0, 0);
        p.line(x1.x, x1.y, x1.z, x2.x, x2.y, x2.z);
        
        p.stroke(0, 0, 255);
        let y1 = mapP5(0, -len/SCALE, 0);
        let y2 = mapP5(0, len/SCALE, 0);
        p.line(y1.x, y1.y, y1.z, y2.x, y2.y, y2.z);
        
        p.stroke(0, 200, 0);
        let z1 = mapP5(0, 0, 0);
        let z2 = mapP5(0, 0, len/SCALE);
        p.line(z1.x, z1.y, z1.z, z2.x, z2.y, z2.z);
        
        p.stroke(200);
        p.noFill();
        let p1 = mapP5(state.xMin, state.yMin, 0);
        let p2 = mapP5(state.xMax, state.yMin, 0);
        let p3 = mapP5(state.xMax, state.yMax, 0);
        let p4 = mapP5(state.xMin, state.yMax, 0);
        p.quad(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, p4.x, p4.y, p4.z);
    }

    function drawSurface(p, f) {
        p.noStroke();
        p.fill(200, 200, 200, 50); 
        const step = 0.2;
        for (let x = state.xMin; x < state.xMax; x += step) {
            p.beginShape(p.TRIANGLE_STRIP);
            for (let y = state.yMin; y <= state.yMax; y += step) {
                let z1 = f(x, y);
                let z2 = f(x + step, y);
                let v1 = mapP5(x, y, z1);
                let v2 = mapP5(x + step, y, z2);
                p.vertex(v1.x, v1.y, v1.z);
                p.vertex(v2.x, v2.y, v2.z);
            }
            p.endShape();
        }
    }

    function drawRiemannBoxes(p, f) {
        const dx = (state.xMax - state.xMin) / state.nx;
        const dy = (state.yMax - state.yMin) / state.ny;
        p.stroke(0, 50); 
        p.strokeWeight(0.5);
        p.fill(30, 136, 229, 150);
        for (let i = 0; i < state.nx; i++) {
            for (let j = 0; j < state.ny; j++) {
                let x = state.xMin + i * dx;
                let y = state.yMin + j * dy;
                let z = f(x, y); 
                let cx = x + dx/2;
                let cy = y + dy/2;
                let cz = z/2;
                let pos = mapP5(cx, cy, cz);
                p.push();
                p.translate(pos.x, pos.y, pos.z);
                p.box(dx * SCALE, z * SCALE, dy * SCALE);
                p.pop();
            }
        }
    }

    // --- x先積分 (y固定スライス) ---
    // 断面のみ
    function drawSingleSliceX(p, f, yVal) {
        p.stroke(229, 57, 53);
        p.strokeWeight(2);
        p.fill(229, 57, 53, 150);
        p.beginShape();
        let vStart = mapP5(state.xMin, yVal, 0);
        p.vertex(vStart.x, vStart.y, vStart.z);
        for (let x = state.xMin; x <= state.xMax; x += 0.1) {
            let z = f(x, yVal);
            let v = mapP5(x, yVal, z);
            p.vertex(v.x, v.y, v.z);
        }
        let vEnd = mapP5(state.xMax, yVal, 0);
        p.vertex(vEnd.x, vEnd.y, vEnd.z);
        p.endShape(p.CLOSE);
    }

    // 体積総和 (厚みのある板)
    function drawAllSlicesX(p, f) {
        const dy = (state.yMax - state.yMin) / state.ny; // 板の厚み
        p.stroke(0, 30);
        p.strokeWeight(0.5);
        p.fill(229, 57, 53, 150);

        for (let j = 0; j < state.ny; j++) {
            let y = state.yMin + j * dy;
            // 形状を描くために、x方向に細かく分割したboxを並べる
            // (真面目に板ポリゴンを作るより実装が安定するため)
            let dx = (state.xMax - state.xMin) / 50; 
            for (let x = state.xMin; x < state.xMax; x += dx) {
                let z = f(x + dx/2, y + dy/2);
                let cx = x + dx/2;
                let cy = y + dy/2;
                let cz = z/2;
                let pos = mapP5(cx, cy, cz);
                p.push();
                p.translate(pos.x, pos.y, pos.z);
                // 奥行き dy の板
                p.box(dx * SCALE, z * SCALE, dy * SCALE);
                p.pop();
            }
        }
    }

    // --- y先積分 (x固定スライス) ---
    // 断面のみ
    function drawSingleSliceY(p, f, xVal) {
        p.stroke(255, 152, 0);
        p.strokeWeight(2);
        p.fill(255, 152, 0, 150);
        p.beginShape();
        let vStart = mapP5(xVal, state.yMin, 0);
        p.vertex(vStart.x, vStart.y, vStart.z);
        for (let y = state.yMin; y <= state.yMax; y += 0.1) {
            let z = f(xVal, y);
            let v = mapP5(xVal, y, z);
            p.vertex(v.x, v.y, v.z);
        }
        let vEnd = mapP5(xVal, state.yMax, 0);
        p.vertex(vEnd.x, vEnd.y, vEnd.z);
        p.endShape(p.CLOSE);
    }

    // 体積総和
    function drawAllSlicesY(p, f) {
        const dx = (state.xMax - state.xMin) / state.nx; // 板の厚み
        p.stroke(0, 30);
        p.strokeWeight(0.5);
        p.fill(255, 152, 0, 150);

        for (let i = 0; i < state.nx; i++) {
            let x = state.xMin + i * dx;
            let dy = (state.yMax - state.yMin) / 50;
            for (let y = state.yMin; y < state.yMax; y += dy) {
                let z = f(x + dx/2, y + dy/2);
                let cx = x + dx/2;
                let cy = y + dy/2;
                let cz = z/2;
                let pos = mapP5(cx, cy, cz);
                p.push();
                p.translate(pos.x, pos.y, pos.z);
                // 幅 dx の板
                p.box(dx * SCALE, z * SCALE, dy * SCALE);
                p.pop();
            }
        }
    }

    p.windowResized = () => {
        let container = document.getElementById('canvas-holder');
        if(container) {
            p.resizeCanvas(container.clientWidth, container.clientHeight);
        }
    };
};