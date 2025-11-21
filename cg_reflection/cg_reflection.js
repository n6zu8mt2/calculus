/**
 * CGライティングの基礎：反射ベクトルシミュレーター
 * p5.js WEBGLモードを使用
 */

// --- メインの3Dシミュレーター ---
const sketchMain = (p) => {
    let u, h, v, w; 
    let thetaDeg;

    let inputUX, inputUY, inputUZ;
    let inputHX, inputHY, inputHZ;
    let resW, resTheta;
    let btnReset;
    let cam;

    p.setup = () => {
        let canvas = p.createCanvas(500, 400, p.WEBGL);
        canvas.parent('canvas-holder');
        
        cam = p.createCamera();
        cam.setPosition(200, -200, 300); 
        cam.lookAt(0, 0, 0);

        inputUX = p.select('#mu-x');
        inputUY = p.select('#mu-y');
        inputUZ = p.select('#mu-z');
        inputHX = p.select('#h-x');
        inputHY = p.select('#h-y');
        inputHZ = p.select('#h-z');
        resW = p.select('#res-w');
        resTheta = p.select('#res-theta');
        btnReset = p.select('#resetBtn');

        const inputs = [inputUX, inputUY, inputUZ, inputHX, inputHY, inputHZ];
        inputs.forEach(input => input.input(updateSimulation));
        btnReset.mousePressed(resetValues);

        p.textFont('sans-serif');
        p.textSize(16);

        updateSimulation();
    };

    function resetValues() {
        inputUX.value(1); inputUY.value(-1); inputUZ.value(0);
        inputHX.value(-1); inputHY.value(2); inputHZ.value(-1);
        updateSimulation();
    }

    function updateSimulation() {
        let ux = parseFloat(inputUX.value()) || 0;
        let uy = parseFloat(inputUY.value()) || 0;
        let uz = parseFloat(inputUZ.value()) || 0;
        u = p.createVector(ux, uy, uz);

        let hx = parseFloat(inputHX.value()) || 0;
        let hy = parseFloat(inputHY.value()) || 0;
        let hz = parseFloat(inputHZ.value()) || 0;
        h = p.createVector(hx, hy, hz);

        if (h.magSq() === 0) h = p.createVector(0, 1, 0);

        let minusU = p5.Vector.mult(u, -1);
        let dot = minusU.dot(h);
        let hMagSq = h.magSq();
        let scalar = dot / hMagSq;
        v = p5.Vector.mult(h, scalar); 

        w = p5.Vector.add(u, p5.Vector.mult(v, 2));

        let cosTheta = dot / (minusU.mag() * h.mag());
        cosTheta = p.constrain(cosTheta, -1, 1);
        thetaDeg = p.degrees(Math.acos(cosTheta));

        resW.html(`(${w.x.toFixed(1)}, ${w.y.toFixed(1)}, ${w.z.toFixed(1)})`);
        resTheta.html(`${thetaDeg.toFixed(1)}°`);
    }

    p.draw = () => {
        p.background(30); 
        p.orbitControl(); 

        drawAxes(150);
        const scale = 50; 

        let hNorm = h.copy().normalize();
        drawArrow(p.createVector(0,0,0), hNorm, scale, p.color(0, 230, 118));
        drawLabel("h", p5.Vector.mult(hNorm, scale * 1.2));
        drawPlane(h, 100);

        let startU = p5.Vector.mult(u, -scale);
        drawArrow(startU, u, scale, p.color(255, 193, 7));
        drawLabel("u", startU);

        drawArrow(p.createVector(0,0,0), v, scale, p.color(41, 121, 255));
        drawLabel("v", p5.Vector.mult(v, scale * 1.2));

        drawArrow(p.createVector(0,0,0), w, scale, p.color(255, 64, 129));
        drawLabel("w", p5.Vector.mult(w, scale * 1.1));
    };

    function drawAxes(len) {
        p.strokeWeight(1);
        p.stroke(255, 100, 100); p.line(0, 0, 0, len, 0, 0);
        p.stroke(100, 255, 100); p.line(0, 0, 0, 0, len, 0);
        p.stroke(100, 100, 255); p.line(0, 0, 0, 0, 0, len);
    }

    function drawArrow(base, vec, scale, col) {
        p.push();
        p.stroke(col); p.strokeWeight(3); p.fill(col);
        let end = p5.Vector.add(base, p5.Vector.mult(vec, scale));
        p.line(base.x, base.y, base.z, end.x, end.y, end.z);
        p.translate(end.x, end.y, end.z);
        let vNorm = vec.copy().normalize();
        let up = p.createVector(0, 1, 0);
        let axis = up.cross(vNorm);
        let angle = Math.acos(up.dot(vNorm));
        if (axis.magSq() < 0.0001) {
            if (up.dot(vNorm) < 0) p.rotateX(p.PI);
        } else {
            p.rotate(angle, axis);
        }
        p.noStroke(); p.cone(5, 15);
        p.pop();
    }

    function drawPlane(normal, size) {
        p.push();
        p.noStroke(); p.fill(255, 255, 255, 30);
        let vNorm = normal.copy().normalize();
        let up = p.createVector(0, 0, 1); 
        let axis = up.cross(vNorm);
        let angle = Math.acos(up.dot(vNorm));
        if (axis.magSq() < 0.0001) {
             if (up.dot(vNorm) < 0) p.rotateX(p.PI);
        } else {
            p.rotate(angle, axis);
        }
        p.plane(size * 3, size * 3);
        p.pop();
    }

    function drawLabel(str, pos) {
        p.push();
        p.translate(pos.x, pos.y, pos.z);
        p.fill(255); p.noStroke();
        p.rotateZ(-cam.tilt);
        p.rotateX(-cam.pan); 
        p.text(str, 0, 0);
        p.pop();
    }
};

// --- 2D解説図 1: 正射影 (Step 2) ---
const sketchProjection = (p) => {
    p.setup = () => {
        let canvas = p.createCanvas(400, 220);
        canvas.parent('projection-diagram-holder');
        p.textAlign(p.CENTER, p.CENTER);
        p.noLoop();
    };

    p.draw = () => {
        p.background(250);
        p.translate(80, 180); // 原点を左下に

        let hLength = 130;
        let vLength = 80;
        
        let h = p.createVector(0, -hLength); 
        let v = p.createVector(0, -vLength);
        let u = p.createVector(100, vLength); 

        // 1. 法線 h (緑)
        drawArrow2D(p, p.createVector(0,0), h, '#00E676', 'h', 1, 0, -20);

        // 2. 入射光 u (黄)
        let startU = p.createVector(-u.x, -u.y);
        drawArrow2D(p, startU, u, '#FFC107', 'u', 2, 0, -10);

        // 3. 逆ベクトル -u (薄い黄, 点線)
        p.stroke(255, 193, 7, 100); p.strokeWeight(2); p.drawingContext.setLineDash([5, 5]);
        p.line(0, 0, -u.x, -u.y);
        p.push(); p.translate(-u.x, -u.y); p.rotate(p.createVector(-u.x, -u.y).heading());
        p.noStroke(); p.fill(255, 193, 7, 100);
        p.triangle(0, 0, -8, 4, -8, -4);
        p.pop();
        p.drawingContext.setLineDash([]);
        
        p.fill(150); p.noStroke(); p.text("-u", -u.x - 15, -u.y);

        // 4. 垂線 (点線)
        p.stroke(150); p.strokeWeight(1); p.drawingContext.setLineDash([3, 3]);
        p.line(-u.x, -u.y, v.x, v.y);
        p.drawingContext.setLineDash([]);
        p.noFill(); p.stroke(100);
        p.rect(0, v.y, 10, 10);

        // 5. 正射影 v (青)
        drawArrow2D(p, p.createVector(0,0), v, '#2979FF', 'v', 3, 15, 0);
        
        // 面
        p.stroke(100); p.strokeWeight(2);
        p.line(-150, 0, 200, 0); 
    };
};

// --- 2D解説図 2: 反射ロジック (Step 3) ---
const sketchReflectionLogic = (p) => {
    p.setup = () => {
        let canvas = p.createCanvas(400, 250);
        canvas.parent('reflection-logic-diagram-holder');
        p.textAlign(p.CENTER, p.CENTER);
        p.noLoop();
    };

    p.draw = () => {
        p.background(250);
        // 修正: 原点を右にずらして u がはみ出さないようにする
        p.translate(150, 180); 

        // ベクトル定義
        let uVec = p.createVector(120, 60);
        let vVec = p.createVector(0, -60);
        
        // 始点S (-120, -60)
        let startU = p.createVector(-120, -60);
        let origin = p.createVector(0, 0); // 反射点

        // 0. 反射面
        p.stroke(150); p.strokeWeight(2);
        p.line(-140, 0, 140, 0);
        
        // 1. 入射光 u (黄)
        drawArrow2D(p, startU, uVec, '#FFC107', 'u', 2, 0, 20); 

        // 2. uの先を支点とする v (青)
        // Origin -> (0, -60)
        let tipV1 = p5.Vector.add(origin, vVec);
        drawArrow2D(p, origin, vVec, '#2979FF', 'v', 2, 15, 0); 

        // 3. uの始点とvの始点(Origin)を結ぶ u+v (点線・水色・矢印あり)
        // startU -> tipV1
        let uPlusV = p5.Vector.add(uVec, vVec); // (120, 0)
        
        // 点線
        p.stroke(100, 200, 255); p.strokeWeight(2); p.drawingContext.setLineDash([5, 5]);
        p.line(startU.x, startU.y, tipV1.x, tipV1.y);
        p.drawingContext.setLineDash([]);
        
        // 矢印の頭 (実線で描画)
        p.push();
        p.translate(tipV1.x, tipV1.y);
        p.rotate(uPlusV.heading());
        p.fill(100, 200, 255); p.noStroke();
        p.triangle(0, 0, -10, 5, -10, -5);
        p.pop();

        p.fill(100, 200, 255); p.noStroke(); p.text("u+v", -60, -45);

        // 4. vの先(tipV1)を始点とする u+v (点線・水色・矢印あり)
        // tipV1 -> tipW
        let tipW = p5.Vector.add(tipV1, uPlusV);
        
        // 点線
        p.stroke(100, 200, 255); p.strokeWeight(2); p.drawingContext.setLineDash([5, 5]);
        p.line(tipV1.x, tipV1.y, tipW.x, tipW.y);
        p.drawingContext.setLineDash([]);
        
        // 矢印の頭
        p.push();
        p.translate(tipW.x, tipW.y);
        p.rotate(uPlusV.heading());
        p.fill(100, 200, 255); p.noStroke();
        p.triangle(0, 0, -10, 5, -10, -5);
        p.pop();

        p.fill(100, 200, 255); p.noStroke(); p.text("u+v", 60, -75);

        // 5. 反射ベクトル w (ピンク)
        // Origin -> tipW
        // w = u + 2v (計算上)
        let wVec = p5.Vector.sub(tipW, origin);
        drawArrow2D(p, origin, wVec, '#FF4081', 'w', 3, 0, -25); 
        
        // 数式ラベル
        p.fill(50); p.noStroke(); p.textSize(16);
        p.text("w = u + 2v", 150, -100);
    };
};

// 2D矢印描画ヘルパー
function drawArrow2D(p, base, vec, color, label, weight=2, labelOffsetX=0, labelOffsetY=-15) {
    p.push();
    p.stroke(color);
    p.strokeWeight(weight);
    p.fill(color);
    
    let end = p5.Vector.add(base, vec);
    p.line(base.x, base.y, end.x, end.y);
    
    // 矢印の先端
    let angle = vec.heading();
    p.translate(end.x, end.y);
    p.rotate(angle);
    p.triangle(0, 0, -10, 5, -10, -5);
    p.rotate(-angle);

    // ラベル
    if (label) {
        p.noStroke();
        p.fill(color); 
        p.textSize(16);
        p.textStyle(p.BOLD);
        
        p.translate(-end.x, -end.y); 
        let mid = p5.Vector.add(base, p5.Vector.div(vec, 2));
        p.text(label, mid.x + labelOffsetX, mid.y + labelOffsetY);
    }
    p.pop();
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('canvas-holder')) {
        new p5(sketchMain);
    }
    if (document.getElementById('projection-diagram-holder')) {
        new p5(sketchProjection);
    }
    if (document.getElementById('reflection-logic-diagram-holder')) {
        new p5(sketchReflectionLogic);
    }
});