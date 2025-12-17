/**
 * 偏微分シミュレーター
 */

// グローバルパラメータ
const params = {
    funcType: 'wave',
    a: 0,
    b: 0,
    showX: true, // x偏微分の可視化
    showY: true, // y偏微分の可視化
    showTangent: true, // 接平面の可視化
    
    // 計算結果
    fa_b: 0,     // f(a,b)
    fx: 0,       // f_x(a,b)
    fy: 0        // f_y(a,b)
};

// 関数定義
const functions = {
    'wave': {
        f: (x, y) => Math.sin(x) + Math.cos(y),
        range: 4, scaleZ: 1.5
    },
    'parabola': {
        f: (x, y) => (x*x + y*y) / 4 - 2,
        range: 4, scaleZ: 1.0
    },
    'saddle': {
        f: (x, y) => (x*x - y*y) / 4,
        range: 4, scaleZ: 1.0
    },
    'hills': {
        f: (x, y) => Math.sin(x) * Math.cos(y) * 2,
        range: 4, scaleZ: 1.0
    }
};

// UI要素
let sliderA, sliderB, valA, valB;
let funcSelector, checkX, checkY, checkTangent;
let valSlopeX, valSlopeY;

// p5インスタンス
let p5Main3D, p5SubX, p5SubY;

// 数値微分の微小量
const h_diff = 0.001;

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    // UI取得
    sliderA = document.getElementById('sliderA');
    sliderB = document.getElementById('sliderB');
    valA = document.getElementById('valA');
    valB = document.getElementById('valB');
    funcSelector = document.getElementById('funcSelector');
    checkX = document.getElementById('checkX');
    checkY = document.getElementById('checkY');
    checkTangent = document.getElementById('checkTangent');
    valSlopeX = document.getElementById('val-slope-x');
    valSlopeY = document.getElementById('val-slope-y');

    // イベントリスナー
    const update = () => {
        params.a = parseFloat(sliderA.value);
        params.b = parseFloat(sliderB.value);
        params.funcType = funcSelector.value;
        params.showX = checkX.checked;
        params.showY = checkY.checked;
        params.showTangent = checkTangent.checked;
        
        valA.textContent = params.a.toFixed(2);
        valB.textContent = params.b.toFixed(2);
        
        calculateDerivatives();
    };

    sliderA.addEventListener('input', update);
    sliderB.addEventListener('input', update);
    funcSelector.addEventListener('change', update);
    checkX.addEventListener('change', update);
    checkY.addEventListener('change', update);
    checkTangent.addEventListener('change', update);

    // 初回計算
    update();

    // p5.js 開始
    p5Main3D = new p5(sketch3D, 'canvas3d-holder');
    p5SubX = new p5(sketch2DX, 'canvas2dx-holder');
    p5SubY = new p5(sketch2DY, 'canvas2dy-holder');
});

// 偏微分の計算 (数値微分)
function calculateDerivatives() {
    const f = functions[params.funcType].f;
    const a = params.a;
    const b = params.b;
    
    params.fa_b = f(a, b);
    params.fx = (f(a + h_diff, b) - f(a - h_diff, b)) / (2 * h_diff);
    params.fy = (f(a, b + h_diff) - f(a, b - h_diff)) / (2 * h_diff);
    
    valSlopeX.textContent = params.fx.toFixed(3);
    valSlopeY.textContent = params.fy.toFixed(3);
}


// --- 3Dメインビュー (WEBGL) ---
const sketch3D = (p) => {
    let cam;
    let font; // テキスト描画用フォント (WEBGLモードではロードが必要だが、ここでは簡易的に線画またはdomを使用)

    p.setup = () => {
        let container = document.getElementById('canvas3d-holder');
        p.createCanvas(container.clientWidth, 400, p.WEBGL);
        cam = p.createCamera();
        cam.setPosition(200, -300, 300);
        cam.lookAt(0, 0, 0);
        p.setAttributes('antialias', true);
        
        // p5.jsの標準フォントを使用
        p.textFont('sans-serif');
        p.textSize(16);
    };

    p.draw = () => {
        p.background(250);
        p.orbitControl(); // マウス操作

        const def = functions[params.funcType];
        const f = def.f;
        const range = def.range;
        const scaleBy = 40; // 描画スケール

        // 座標軸 (矢印付き・ラベル付き)
        drawAxes3D(p, 200);

        // 曲面の描画
        p.noStroke();
        p.fill(200, 200, 250, 150);
        p.ambientLight(150);
        p.directionalLight(255, 255, 255, 0.5, 1, -0.5);

        const steps = 30;
        const d = (range * 2) / steps;
        
        for (let x = -range; x < range; x += d) {
            p.beginShape(p.TRIANGLE_STRIP);
            for (let y = -range; y <= range; y += d) {
                let z1 = f(x, y);
                let z2 = f(x + d, y);
                p.vertex(x * scaleBy, -z1 * scaleBy * def.scaleZ, y * scaleBy);
                p.vertex((x + d) * scaleBy, -z2 * scaleBy * def.scaleZ, y * scaleBy);
            }
            p.endShape();
        }

        // 点P (a, b, f(a,b)) の座標
        let px = params.a * scaleBy;
        let py = params.b * scaleBy;
        let pz = -params.fa_b * scaleBy * def.scaleZ;

        // --- 接平面の描画 ---
        if (params.showTangent) {
            p.push();
            p.fill(255, 152, 0, 100); // オレンジ半透明
            p.noStroke();
            
            // 接平面の方程式: z = f(a,b) + fx(x-a) + fy(y-b)
            // 中心(a,b)から +-2 くらいの範囲を描画
            let planeRange = 2.0; 
            p.beginShape();
            
            // 四隅の計算
            let corners = [
                {x: params.a - planeRange, y: params.b - planeRange},
                {x: params.a + planeRange, y: params.b - planeRange},
                {x: params.a + planeRange, y: params.b + planeRange},
                {x: params.a - planeRange, y: params.b + planeRange}
            ];
            
            corners.forEach(pt => {
                // z = f(a,b) + fx*(x-a) + fy*(y-b)
                let zVal = params.fa_b + params.fx * (pt.x - params.a) + params.fy * (pt.y - params.b);
                p.vertex(pt.x * scaleBy, -zVal * scaleBy * def.scaleZ, pt.y * scaleBy);
            });
            
            p.endShape(p.CLOSE);
            p.pop();
        }

        // --- 切断平面と曲線の描画 ---

        // X偏微分 (y=b で切断) -> 青
        if (params.showX) {
            // 切断平面 y=b
            p.push();
            p.translate(0, 0, py);
            p.fill(30, 136, 229, 30);
            p.noStroke();
            p.plane(range * 2 * scaleBy, 300);
            p.pop();

            // 断面曲線
            p.noFill();
            p.stroke(30, 136, 229);
            p.strokeWeight(3);
            p.beginShape();
            for (let x = -range; x <= range; x += 0.1) {
                let z = f(x, params.b);
                p.vertex(x * scaleBy, -z * scaleBy * def.scaleZ, py);
            }
            p.endShape();

            // 接線ベクトル
            drawTangentVector(p, px, py, pz, 1, 0, params.fx, scaleBy, def.scaleZ, p.color(0, 0, 150));
        }

        // Y偏微分 (x=a で切断) -> 赤
        if (params.showY) {
            // 切断平面 x=a
            p.push();
            p.translate(px, 0, 0);
            p.rotateY(p.PI / 2);
            p.fill(229, 57, 53, 30);
            p.noStroke();
            p.plane(range * 2 * scaleBy, 300);
            p.pop();

            // 断面曲線
            p.noFill();
            p.stroke(229, 57, 53);
            p.strokeWeight(3);
            p.beginShape();
            for (let y = -range; y <= range; y += 0.1) {
                let z = f(params.a, y);
                p.vertex(px, -z * scaleBy * def.scaleZ, y * scaleBy);
            }
            p.endShape();

            // 接線ベクトル
            drawTangentVector(p, px, py, pz, 0, 1, params.fy, scaleBy, def.scaleZ, p.color(150, 0, 0));
        }

        // 点Pの描画
        p.push();
        p.translate(px, pz, py);
        p.noStroke();
        p.fill(0);
        p.sphere(4);
        p.pop();
    };

    function drawAxes3D(p, len) {
        p.strokeWeight(2);
        
        // X軸 (赤)
        p.stroke(200, 50, 50);
        p.line(-len, 0, 0, len, 0, 0);
        // 矢印
        p.push(); p.translate(len, 0, 0); p.rotateZ(-p.PI/2); p.noStroke(); p.fill(200, 50, 50); p.cone(5, 15); p.pop();
        // ラベル
        drawLabel(p, "x", len + 20, 0, 0);

        // Y軸 (青) -> p5のZ軸
        p.stroke(50, 50, 200);
        p.line(0, 0, -len, 0, 0, len);
        // 矢印
        p.push(); p.translate(0, 0, len); p.rotateX(p.PI/2); p.noStroke(); p.fill(50, 50, 200); p.cone(5, 15); p.pop();
        // ラベル
        drawLabel(p, "y", 0, 0, len + 20);

        // Z軸 (緑) -> p5のY軸 (負方向が上)
        p.stroke(50, 200, 50);
        p.line(0, len, 0, 0, -len, 0); // 上がマイナス
        // 矢印 (上に)
        p.push(); p.translate(0, -len, 0); p.noStroke(); p.fill(50, 200, 50); p.cone(5, 15); p.pop();
        // ラベル
        drawLabel(p, "z", 0, -len - 20, 0);
    }

    function drawLabel(p, str, x, y, z) {
        p.push();
        p.translate(x, y, z);
        p.fill(0); p.noStroke();
        // カメラに向けるビルボード処理簡易版
        p.rotateZ(-cam.tilt);
        p.rotateX(-cam.pan);
        p.text(str, 0, 0);
        p.pop();
    }

    function drawTangentVector(p, px, py, pz, dx, dy, slope, scale, scaleZ, col) {
        let tanLen = 80;
        // ベクトル (dx, dy, slope)
        // p5座標: (dx*scale, -slope*scale*scaleZ, dy*scale)
        let vx = dx * scale;
        let vy = dy * scale; // p5のZ軸
        let vz = -slope * scale * scaleZ; // p5のY軸
        
        let len = Math.sqrt(vx*vx + vy*vy + vz*vz);
        if (len < 0.001) return;
        
        let nx = vx / len * tanLen;
        let ny = vy / len * tanLen;
        let nz = vz / len * tanLen;

        p.stroke(col);
        p.strokeWeight(2);
        p.line(px - nx, pz - nz, py - ny, px + nx, pz + nz, py + ny);
    }

    p.windowResized = () => {
        let container = document.getElementById('canvas3d-holder');
        p.resizeCanvas(container.clientWidth, 400);
    };
};


// --- 2D断面図 (X偏微分: z vs x) ---
const sketch2DX = (p) => {
    p.setup = () => {
        let container = document.getElementById('canvas2dx-holder');
        p.createCanvas(container.clientWidth, 250);
        p.textSize(12);
    };

    p.draw = () => {
        p.background(255);
        if (!params.showX) {
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(150); p.noStroke();
            p.text("非表示", p.width/2, p.height/2);
            return;
        }

        const def = functions[params.funcType];
        const range = def.range;
        const scale = 40;
        
        p.translate(p.width / 2, p.height / 2 + 50);
        p.scale(1, -1);

        // 軸描画 (目盛り付き)
        drawAxes2D(p, range * scale, 'x', 'z', scale);

        // グラフ z = f(x, b)
        p.stroke(30, 136, 229); p.strokeWeight(2); p.noFill();
        p.beginShape();
        for (let x = -range; x <= range; x += 0.1) {
            let z = def.f(x, params.b);
            p.vertex(x * scale, z * scale * def.scaleZ);
        }
        p.endShape();

        // 点
        let px = params.a * scale;
        let pz = params.fa_b * scale * def.scaleZ;
        p.fill(0); p.noStroke();
        p.ellipse(px, pz, 6, 6);

        // 接線
        p.stroke(0, 0, 150); p.strokeWeight(1);
        let tanLen = 100;
        let dx = 1;
        let dz = params.fx * def.scaleZ;
        let len = Math.sqrt(dx*dx + dz*dz);
        let uvx = dx / len * tanLen;
        let uvz = dz / len * tanLen;
        p.line(px - uvx, pz - uvz, px + uvx, pz + uvz);
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas2dx-holder');
        p.resizeCanvas(container.clientWidth, 250);
    };
};


// --- 2D断面図 (Y偏微分: z vs y) ---
const sketch2DY = (p) => {
    p.setup = () => {
        let container = document.getElementById('canvas2dy-holder');
        p.createCanvas(container.clientWidth, 250);
        p.textSize(12);
    };

    p.draw = () => {
        p.background(255);
        if (!params.showY) {
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(150); p.noStroke();
            p.text("非表示", p.width/2, p.height/2);
            return;
        }

        const def = functions[params.funcType];
        const range = def.range;
        const scale = 40;
        
        p.translate(p.width / 2, p.height / 2 + 50);
        p.scale(1, -1);

        // 軸描画 (目盛り付き)
        drawAxes2D(p, range * scale, 'y', 'z', scale);

        // グラフ z = f(a, y)
        p.stroke(229, 57, 53); p.strokeWeight(2); p.noFill();
        p.beginShape();
        for (let y = -range; y <= range; y += 0.1) {
            let z = def.f(params.a, y);
            p.vertex(y * scale, z * scale * def.scaleZ);
        }
        p.endShape();

        // 点
        let py = params.b * scale;
        let pz = params.fa_b * scale * def.scaleZ;
        p.fill(0); p.noStroke();
        p.ellipse(py, pz, 6, 6);

        // 接線
        p.stroke(150, 0, 0); p.strokeWeight(1);
        let tanLen = 100;
        let dy = 1;
        let dz = params.fy * def.scaleZ;
        let len = Math.sqrt(dy*dy + dz*dz);
        let uvy = dy / len * tanLen;
        let uvz = dz / len * tanLen;
        p.line(py - uvy, pz - uvz, py + uvy, pz + uvz);
    };

    p.windowResized = () => {
        let container = document.getElementById('canvas2dy-holder');
        p.resizeCanvas(container.clientWidth, 250);
    };
};

// 2D軸描画関数 (目盛り付き)
function drawAxes2D(p, len, hLabel, vLabel, scalePx) {
    p.stroke(180);
    p.strokeWeight(1);
    
    // 軸線
    p.line(-len, 0, len, 0); // 横軸
    p.line(0, -len/2, 0, len); // 縦軸 (少し下まで)

    // テキスト描画用に反転戻す
    p.scale(1, -1);
    p.fill(100); p.noStroke();
    
    // 軸ラベル
    p.textAlign(p.RIGHT, p.TOP);
    p.text(hLabel, len - 5, 5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(vLabel, 5, -len + 5);

    // 目盛り (1単位ごと)
    p.textAlign(p.CENTER, p.TOP);
    p.stroke(200);
    
    // 横軸目盛り
    let maxVal = Math.floor(len / scalePx);
    for (let i = -maxVal; i <= maxVal; i++) {
        if (i === 0) continue;
        let x = i * scalePx;
        p.line(x, -3, x, 3); // 目盛り線
        p.noStroke();
        p.text(i, x, 5); // 数値
        p.stroke(200);
    }

    // 縦軸目盛り
    p.textAlign(p.RIGHT, p.MIDDLE);
    let maxValY = Math.floor(len / scalePx); // 縦も同じスケールと仮定
    for (let i = -Math.floor(len/2/scalePx); i <= maxValY; i++) {
        if (i === 0) continue;
        let y = -i * scalePx; // y軸反転してるのでscreen上はマイナス方向がプラス
        p.line(-3, y, 3, y);
        p.noStroke();
        p.text(i, -5, y);
        p.stroke(200);
    }

    p.scale(1, -1); // 元に戻す
}