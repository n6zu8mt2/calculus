/**
 * 三角関数の応用ページ用スクリプト
 * 1. 3Dライティング (ランバート反射) デモ
 * 2. サイン波比較デモ
 */

// --- 1. 3Dライティング (ランバート反射) デモ ---
const sketchLighting = (p) => {
    let angleSlider;
    let angleValueSpan, brightnessValueSpan;
    let center;
    const vecLength = 80; // ベクトル長を少し短く

    p.setup = () => {
        let canvas = p.createCanvas(300, 250); // キャンバスサイズ調整
        canvas.parent('lighting-canvas-holder');
        center = p.createVector(p.width / 2, p.height * 0.7);

        // UI要素を取得
        angleSlider = p.select('#angle');
        angleValueSpan = p.select('#angleValue');
        brightnessValueSpan = p.select('#brightnessValue');

        // スライダーが動いたら再描画
        angleSlider.input(() => p.redraw());

        p.noLoop();
        p.redraw();
    };

    p.draw = () => {
        p.background(255);
        
        let angleDeg = angleSlider.value();
        let angleRad = p.radians(angleDeg);
        
        // --- 1. 表面 ---
        p.stroke(0); p.strokeWeight(4);
        p.line(center.x - 100, center.y, center.x + 100, center.y);
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.TOP);
        p.text("Surface", center.x, center.y + 5);

        // --- 2. 法線ベクトル (N) ---
        let normalVec = p.createVector(0, -vecLength);
        drawVector(p, center, normalVec, '#1E88E5', 'N (Normal)');
        
        // --- 3. 光のベクトル (L) ---
        let lightAngle = p.radians(-90) + angleRad; 
        let lightVec = p.createVector(vecLength * p.cos(lightAngle), vecLength * p.sin(lightAngle));
        drawVector(p, center, lightVec, '#E53935', 'L (Light)');

        // --- 4. 角度θの円弧 ---
        p.noFill(); p.stroke(0, 0, 0, 100); p.strokeWeight(2);
        if (angleDeg <= 90) {
             p.arc(center.x, center.y, 60, 60, p.radians(-90), lightAngle);
        } else {
             p.arc(center.x, center.y, 60, 60, lightAngle, p.radians(-90));
        }
        
        // --- 5. $\cos(\theta)$ の計算と表示 ---
        let cosTheta = p.cos(angleRad);
        let brightness = p.max(0, cosTheta); 
        
        // UIテキストを更新
        angleValueSpan.html(`${angleDeg}°`);
        brightnessValueSpan.html(brightness.toFixed(3));
        
        // θ ラベル
        let labelAngle = p.radians(-90) + angleRad / 2;
        let labelPos = p.createVector(40 * p.cos(labelAngle), 40 * p.sin(labelAngle));
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.CENTER);
        p.text("θ", center.x + labelPos.x, center.y + labelPos.y);
    };

    // ベクトルを描画するヘルパー関数
    function drawVector(p, base, v, color, label) {
        p.push(); 
        p.stroke(color);
        p.strokeWeight(3);
        p.fill(color);
        p.translate(base.x, base.y); 
        p.line(0, 0, v.x, v.y);
        
        let angle = v.heading(); 
        p.translate(v.x, v.y);
        p.rotate(angle);
        p.triangle(0, 0, -8, 4, -8, -4);
        
        p.rotate(-angle); 
        p.noStroke();
        p.fill(0);
        p.textAlign(p.CENTER);
        let labelOffset = p.createVector(v.x, v.y).normalize().mult(20);
        // ラベルがキャンバスの外に出ないように調整
        let textX = p.constrain(labelOffset.x, -p.width/2 + 20, p.width/2 - 20);
        let textY = p.constrain(labelOffset.y, -p.height/2 + 20, p.height/2 - 20);
        p.text(label, textX, textY);
        
        p.pop(); 
    }
};

// --- 2. サイン波比較デモ ---
const sketchSineWaves = (p) => {
    const padding = 40;
    const xMin = -2 * Math.PI;
    const xMax = 2 * Math.PI;
    const yMin = -2.5;
    const yMax = 2.5;
    let canvasWidth = 450;
    let canvasHeight = 250;
    
    let ampSlider, freqSlider, phaseSlider;
    let ampValueSpan, freqValueSpan, phaseValueSpan;

    const toScreenX = (x) => p.map(x, xMin, xMax, padding, canvasWidth - padding);
    const toScreenY = (y) => p.map(y, yMin, yMax, canvasHeight - padding, padding);

    p.setup = () => {
        let canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent('sine-wave-canvas-holder');

        ampSlider = p.select('#amplitude');
        freqSlider = p.select('#frequency');
        phaseSlider = p.select('#phase');
        ampValueSpan = p.select('#amplitudeValue');
        freqValueSpan = p.select('#frequencyValue');
        phaseValueSpan = p.select('#phaseValue');

        ampSlider.input(() => p.redraw());
        freqSlider.input(() => p.redraw());
        phaseSlider.input(() => p.redraw());

        p.noLoop(); 
        p.redraw(); 
    };

    p.draw = () => {
        p.background(255);
        drawAxesAndGrid(p, toScreenX, toScreenY, xMin, xMax, yMin, yMax);
        
        const A = ampSlider.value();
        const B = freqSlider.value();
        const C = phaseSlider.value();
        
        ampValueSpan.html(parseFloat(A).toFixed(1));
        freqValueSpan.html(parseFloat(B).toFixed(1));
        phaseValueSpan.html(parseFloat(C).toFixed(2));

        // 1. 基準のサインカーブ y = sin(x) (グレー)
        p.noFill();
        p.stroke(158, 158, 158); // グレー
        p.strokeWeight(2);
        p.beginShape();
        for (let x = xMin; x <= xMax; x += 0.05) {
            p.vertex(toScreenX(x), toScreenY(Math.sin(x)));
        }
        p.endShape();
        
        // 2. 比較対象のサインカーブ y = A*sin(B*x + C) (赤)
        p.stroke(229, 57, 53); // 赤色
        p.strokeWeight(2.5);
        p.beginShape();
        for (let x = xMin; x <= xMax; x += 0.05) {
            p.vertex(toScreenX(x), toScreenY(A * Math.sin(B * x + C)));
        }
        p.endShape();
    };
    
    // 軸と目盛りを描画する関数
    function drawAxesAndGrid(p, xFunc, yFunc, xMin, xMax, yMin, yMax) {
        p.stroke(200); p.strokeWeight(1);
        
        const yZero = p.constrain(yFunc(0), padding, p.height - padding);
        p.line(padding, yZero, p.width - padding, yZero);
        const xZero = p.constrain(xFunc(0), padding, p.width - padding);
        p.line(xZero, padding, xZero, p.height - padding);
        
        p.fill(0); p.noStroke(); p.textSize(10);
        
        // X軸の目盛り (π/2 ごと)
        p.textAlign(p.CENTER, p.TOP);
        for (let x = Math.ceil(xMin / (Math.PI/2)) * (Math.PI/2); x <= xMax; x += (Math.PI/2)) {
            let label = "";
            const multiple = Math.round(x / (Math.PI/2));
            if (multiple === 0) label = "0";
            else if (multiple === 1) label = "π/2";
            else if (multiple === -1) label = "-π/2";
            else if (multiple === 2) label = "π";
            else if (multiple === -2) label = "-π";
            else continue; 
            p.text(label, xFunc(x), yZero + 5);
        }
        
        // Y軸の目盛り (整数ごと)
        p.textAlign(p.RIGHT, p.CENTER);
        for (let y = Math.ceil(yMin); y <= yMax; y++) {
            if (y === 0) continue;
            p.text(y, xZero - 5, yFunc(y));
        }
    }
};

// --- DOM読み込み完了時に両方のスケッチを開始 ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lighting-canvas-holder')) {
        new p5(sketchLighting);
    }
    if (document.getElementById('sine-wave-canvas-holder')) {
        new p5(sketchSineWaves);
    }
});