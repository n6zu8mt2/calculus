/**
 * 三角関数の応用ページ用スクリプト
 * 1. 放物運動デモ
 * 2. 等速円運動デモ
 * 3. 単振動デモ
 * 4. 3Dライティング (ランバート反射) デモ
 * 5. サイン波比較デモ
 * 6. 三角測量デモ (NEW)
 */

// --- 1. 物理エンジンと放物運動デモ ---
const sketchParabolic = (p) => {
    let angleSlider, velSlider, fireButton, clearButton;
    let angleValueSpan, velValueSpan;
    
    let projectiles = []; // 発射された弾
    let g = 9.8 * 3; // 見た目の重力 (ピクセル/秒^2)
    let startX, startY;

    p.setup = () => {
        let canvas = p.createCanvas(500, 300);
        canvas.parent('parabolic-canvas-holder');
        startX = 30;
        startY = p.height - 30;

        // UI
        angleSlider = p.select('#parabolic-angle');
        velSlider = p.select('#parabolic-velocity');
        fireButton = p.select('#parabolic-fireButton');
        clearButton = p.select('#parabolic-clearButton');
        angleValueSpan = p.select('#parabolic-angleValue');
        velValueSpan = p.select('#parabolic-velocityValue');

        // イベント
        fireButton.mousePressed(fire);
        clearButton.mousePressed(clearProjectiles);
        angleSlider.input(updateUI);
        velSlider.input(updateUI);
        
        updateUI();
        p.loop(); // 常にアニメーション
    };

    function updateUI() {
        angleValueSpan.html(`${angleSlider.value()}°`);
        velValueSpan.html(velSlider.value());
        drawNoLoop(); // 静止画を更新
    }
    
    function fire() {
        let angle = p.radians(angleSlider.value());
        let v0 = velSlider.value();
        projectiles.push({
            x: 0,
            y: 0,
            vx: v0 * p.cos(angle),
            vy: -v0 * p.sin(angle), // p5のY軸は下向きなので、上向きはマイナス
            t: 0,
            path: [] // 軌跡
        });
    }
    
    function clearProjectiles() {
        projectiles = [];
        drawNoLoop(); // 静止画を更新
    }
    
    function drawNoLoop() {
         if (!p.isLooping()) p.redraw();
    }

    p.draw = () => {
        p.background(255);
        
        // 地面と大砲
        p.stroke(0); p.strokeWeight(2);
        p.fill(150);
        p.line(0, startY, p.width, startY);
        p.push();
        p.translate(startX, startY);
        p.rotate(p.radians(-angleSlider.value())); // -theta
        p.fill(50);
        p.rect(0, -5, 30, 10);
        p.pop();

        // 弾の更新と描画
        let dt = p.deltaTime / 1000.0; // 秒単位
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let proj = projectiles[i];
            
            proj.t += dt;
            proj.vy += g * dt; // 重力
            
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            
            // 軌跡を追加
            proj.path.push(p.createVector(proj.x, proj.y));
            
            // 軌跡を描画
            p.noFill(); p.stroke(229, 57, 53, 100); p.strokeWeight(1);
            p.beginShape();
            proj.path.forEach(v => {
                p.vertex(startX + v.x, startY + v.y);
            });
            p.endShape();
            
            // 弾を描画
            p.fill(229, 57, 53); p.noStroke();
            p.ellipse(startX + proj.x, startY + proj.y, 10, 10);
            
            // 地面に着いたら消す
            if (startY + proj.y > startY) {
                projectiles.splice(i, 1);
            }
        }
    };
};


// --- 2. 等速円運動デモ (修正版) ---
const sketchCircularMotion = (p) => {
    let A_x, A_y, w; // X振幅, Y振幅, Omega
    let t = 0; // time
    let isPlaying = false;
    let centerX, centerY;
    
    // UI Elements
    let ampXSlider, ampYSlider, omegaSlider, playButton, resetButton;
    let ampXSpan, ampYSpan, omegaSpan;

    p.setup = () => {
        let canvas = p.createCanvas(500, 300);
        canvas.parent('circular-motion-canvas-holder');
        centerX = p.width / 2;
        centerY = p.height / 2;

        // UI取得
        ampXSlider = p.select('#cm-amplitude-x');
        ampYSlider = p.select('#cm-amplitude-y'); // ▼ Y振幅スライダー
        omegaSlider = p.select('#cm-omega');
        playButton = p.select('#cm-playPauseButton');
        resetButton = p.select('#cm-resetButton');
        ampXSpan = p.select('#cm-amplitude-xValue');
        ampYSpan = p.select('#cm-amplitude-yValue'); // ▼ Y振幅スパン
        omegaSpan = p.select('#cm-omegaValue');

        // イベントリスナー
        playButton.mousePressed(togglePlay);
        resetButton.mousePressed(resetTime);
        ampXSlider.input(updateValues);
        ampYSlider.input(updateValues); // ▼ Y振幅イベント
        omegaSlider.input(updateValues);
        
        updateValues(); // 初期値設定
        p.noLoop();
    };

    function updateValues() {
        A_x = ampXSlider.value();
        A_y = ampYSlider.value(); // ▼ Y振幅を取得
        w = omegaSlider.value();
        ampXSpan.html(parseFloat(A_x).toFixed(0));
        ampYSpan.html(parseFloat(A_y).toFixed(0)); // ▼ Y振幅を表示
        omegaSpan.html(parseFloat(w).toFixed(1));
        if (!isPlaying) p.redraw(); // 値変更時に静止画を更新
    }
    
    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            p.loop();
            playButton.html('一時停止');
            playButton.addClass('playing');
        } else {
            p.noLoop();
            playButton.html('再生');
            playButton.removeClass('playing');
        }
    }

    function resetTime() {
        t = 0;
        if (!isPlaying) p.redraw();
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += p.deltaTime / 1000.0;
        }

        // ▼▼▼ 座標計算を (A cos, -B sin) に変更 ▼▼▼
        // これで反時計回りになる (t=0 -> (A,0), t=PI/2w -> (0, -B))
        let x = A_x * p.cos(w * t);
        let y = -A_y * p.sin(w * t); // p5はY軸が下向きのため
        // ▲▲▲ 変更ここまで ▲▲▲

        p.translate(centerX, centerY);
        
        p.stroke(200); p.strokeWeight(1);
        p.line(-p.width/2, 0, p.width/2, 0);
        p.line(0, -p.height/2, 0, p.height/2);

        // 軌道 (楕円)
        p.noFill(); p.stroke(150); p.strokeWeight(1);
        p.ellipse(0, 0, A_x * 2, A_y * 2);

        p.stroke(30, 136, 229, 100);
        p.line(0, 0, x, y);
        p.line(x, y, x, 0);
        p.line(x, y, 0, y);
        
        p.fill(30, 136, 229); p.stroke(255); p.strokeWeight(2);
        p.ellipse(x, y, 20, 20);
        
        p.fill(229, 57, 53); p.noStroke();
        p.ellipse(x, 0, 10, 10);
        p.ellipse(0, y, 10, 10);
    };
};

// --- 3. 単振動デモ ---
const sketchSHM = (p) => {
    let A, w;
    let t = 0;
    let isPlaying = false;
    let centerX, centerY;
    
    // UI Elements
    let ampSlider, omegaSlider, playButton, resetButton;
    let ampSpan, omegaSpan;

    p.setup = () => {
        let canvas = p.createCanvas(500, 150);
        canvas.parent('shm-canvas-holder');
        centerX = p.width / 2;
        centerY = p.height / 2 + 10;

        // UI取得
        ampSlider = p.select('#shm-amplitude');
        omegaSlider = p.select('#shm-omega');
        playButton = p.select('#shm-playPauseButton');
        resetButton = p.select('#shm-resetButton');
        ampSpan = p.select('#shm-amplitudeValue');
        omegaSpan = p.select('#shm-omegaValue');

        // イベントリスナー
        playButton.mousePressed(togglePlay);
        resetButton.mousePressed(resetTime);
        ampSlider.input(updateValues);
        omegaSlider.input(updateValues);
        
        updateValues(); 
        p.noLoop();
    };

    function updateValues() {
        A = ampSlider.value();
        w = omegaSlider.value();
        ampSpan.html(parseFloat(A).toFixed(0));
        omegaSpan.html(parseFloat(w).toFixed(1));
        if (!isPlaying) p.redraw();
    }
    
    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            p.loop();
            playButton.html('一時停止');
            playButton.addClass('playing');
        } else {
            p.noLoop();
            playButton.html('再生');
            playButton.removeClass('playing');
        }
    }

    function resetTime() {
        t = 0;
        if (!isPlaying) p.redraw();
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += p.deltaTime / 1000.0; 
        }

        let x = A * p.cos(w * t);
        
        p.translate(centerX, centerY);
        
        p.stroke(150); p.strokeWeight(1);
        p.line(-p.width/2, 0, p.width/2, 0);
        
        let wallX = -p.width/2 + 50;
        p.stroke(0); p.strokeWeight(4);
        p.line(wallX, -30, wallX, 30);

        drawSpring(p, wallX, x, 0);
        
        p.fill(229, 57, 53); p.stroke(255); p.strokeWeight(2);
        p.ellipse(x, 0, 30, 30);
    };

    function drawSpring(p, x1, x2, y) {
        p.noFill(); p.stroke(100); p.strokeWeight(2);
        let len = x2 - x1;
        let coils = 15;
        let coilWidth = len / (coils + 2);
        let springHeight = 15;
        
        p.beginShape();
        p.vertex(x1, y);
        p.vertex(x1 + coilWidth, y);
        for (let i = 1; i <= coils; i++) {
            let x = x1 + coilWidth * (i + 0.5);
            let y_offset = (i % 2 === 0) ? -springHeight : springHeight;
            p.vertex(x, y + y_offset);
        }
        p.vertex(x2 - coilWidth, y);
        p.vertex(x2, y);
        p.endShape();
    }
};


// --- 4. 3Dライティング (ランバート反射) デモ (修正版) ---
const sketchLighting = (p) => {
    let angleSlider;
    let angleValueSpan, brightnessValueSpan;
    let center;
    const vecLength = 80; 

    p.setup = () => {
        let canvas = p.createCanvas(300, 250); 
        canvas.parent('lighting-canvas-holder');
        center = p.createVector(p.width / 2, p.height * 0.7);

        angleSlider = p.select('#angle');
        angleValueSpan = p.select('#angleValue');
        brightnessValueSpan = p.select('#brightnessValue');

        angleSlider.input(() => p.redraw());

        p.noLoop();
        p.redraw();
    };

    p.draw = () => {
        p.background(255);
        
        let angleDeg = angleSlider.value();
        let angleRad = p.radians(angleDeg); // -PI/2 から PI/2
        
        p.stroke(0); p.strokeWeight(4);
        p.line(center.x - 100, center.y, center.x + 100, center.y);
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.TOP);
        p.text("Surface", center.x, center.y + 5);

        let normalVec = p.createVector(0, -vecLength);
        drawVector(p, center, normalVec, '#1E88E5', 'N (Normal)');
        
        let lightAngle_p5 = p.radians(-90) + angleRad; 
        let lightVec = p.createVector(vecLength * p.cos(lightAngle_p5), vecLength * p.sin(lightAngle_p5));
        drawVector(p, center, lightVec, '#E53935', 'L (Light)');

        p.noFill(); p.stroke(0, 0, 0, 100); p.strokeWeight(2);
        if (angleRad > 0) { // 右側
             p.arc(center.x, center.y, 60, 60, p.radians(-90), lightAngle_p5);
        } else { // 左側
             p.arc(center.x, center.y, 60, 60, lightAngle_p5, p.radians(-90));
        }
        
        let cosTheta = p.cos(angleRad);
        let brightness = p.max(0, cosTheta); 
        
        angleValueSpan.html(`${angleDeg}°`);
        brightnessValueSpan.html(brightness.toFixed(3));
        
        let labelAngle_p5 = p.radians(-90) + angleRad / 2;
        let labelPos = p.createVector(40 * p.cos(labelAngle_p5), 40 * p.sin(labelAngle_p5));
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.CENTER);
        p.text("θ", center.x + labelPos.x, center.y + labelPos.y);
    };

    // ベクトル描画ヘルパー (変更なし)
    function drawVector(p, base, v, color, label) {
        p.push(); 
        p.stroke(color); p.strokeWeight(3); p.fill(color);
        p.translate(base.x, base.y); 
        p.line(0, 0, v.x, v.y);
        let angle = v.heading(); 
        p.translate(v.x, v.y); p.rotate(angle);
        p.triangle(0, 0, -8, 4, -8, -4);
        p.rotate(-angle); 
        p.noStroke(); p.fill(0); p.textAlign(p.CENTER);
        let labelOffset = p.createVector(v.x, v.y).normalize().mult(20);
        let textX = p.constrain(labelOffset.x, -p.width/2 + 20, p.width/2 - 20);
        let textY = p.constrain(labelOffset.y, -p.height/2 + 20, p.height/2 - 20);
        p.text(label, textX, textY);
        p.pop(); 
    }
};

// --- 5. サイン波比較デモ (変更なし) ---
const sketchSineWaves = (p) => {
    // ( ... 前回のコード ... )
    const padding = 40;
    const xMin = -2 * Math.PI; const xMax = 2 * Math.PI;
    const yMin = -2.5; const yMax = 2.5;
    let canvasWidth = 450; let canvasHeight = 250;
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
        p.noLoop(); p.redraw(); 
    };
    p.draw = () => {
        p.background(255);
        drawAxesAndGrid(p, toScreenX, toScreenY, xMin, xMax, yMin, yMax);
        const A = ampSlider.value(); const B = freqSlider.value(); const C = phaseSlider.value();
        ampValueSpan.html(parseFloat(A).toFixed(1));
        freqValueSpan.html(parseFloat(B).toFixed(1));
        phaseValueSpan.html(parseFloat(C).toFixed(2));
        p.noFill(); p.stroke(158, 158, 158); p.strokeWeight(2);
        p.beginShape();
        for (let x = xMin; x <= xMax; x += 0.05) { p.vertex(toScreenX(x), toScreenY(Math.sin(x))); }
        p.endShape();
        p.stroke(229, 57, 53); p.strokeWeight(2.5);
        p.beginShape();
        for (let x = xMin; x <= xMax; x += 0.05) { p.vertex(toScreenX(x), toScreenY(A * Math.sin(B * x + C))); }
        p.endShape();
    };
    function drawAxesAndGrid(p, xFunc, yFunc, xMin, xMax, yMin, yMax) {
        p.stroke(200); p.strokeWeight(1);
        const yZero = p.constrain(yFunc(0), padding, p.height - padding);
        p.line(padding, yZero, p.width - padding, yZero);
        const xZero = p.constrain(xFunc(0), padding, p.width - padding);
        p.line(xZero, padding, xZero, p.height - padding);
        p.fill(0); p.noStroke(); p.textSize(10);
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
        p.textAlign(p.RIGHT, p.CENTER);
        for (let y = Math.ceil(yMin); y <= yMax; y++) {
            if (y === 0) continue;
            p.text(y, xZero - 5, yFunc(y));
        }
    }
};

// --- 6. 三角測量デモ (修正版) ---
const sketchTriangulation = (p) => {
    let angleASlider, angleBSlider, distCSlider;
    let angleASpan, angleBSpan, distCSpan, resultSpan;

    p.setup = () => {
        let canvas = p.createCanvas(500, 300);
        canvas.parent('triangulation-canvas-holder');
        
        // UI
        angleASlider = p.select('#tri-angle-a');
        angleBSlider = p.select('#tri-angle-b');
        distCSlider = p.select('#tri-distance');
        angleASpan = p.select('#tri-angle-aValue');
        angleBSpan = p.select('#tri-angle-bValue');
        distCSpan = p.select('#tri-distanceValue');
        resultSpan = p.select('#tri-position-result');

        // イベント
        angleASlider.input(() => p.redraw());
        angleBSlider.input(() => p.redraw());
        distCSlider.input(() => p.redraw());

        p.noLoop();
        p.redraw();
    };

    p.draw = () => {
        p.background(255);
        
        let angleA_deg = angleASlider.value();
        let angleB_deg = angleBSlider.value();
        let c_dist = distCSlider.value();
        
        // 値を更新
        angleASpan.html(`${angleA_deg}°`);
        angleBSpan.html(`${angleB_deg}°`);
        distCSpan.html(c_dist);

        // p5の原点を左下隅に移動 + Y軸反転
        let originX = p.width * 0.1;
        let originY = p.height - 30;
        p.translate(originX, originY);
        p.scale(1, -1); // Y軸を上向きに (数学座標系)

        // 塔AとBを配置
        let towerA = p.createVector(0, 0);
        let towerB = p.createVector(c_dist, 0);
        
        // 角度をラジアンに
        let angleA_rad = p.radians(angleA_deg);
        let angleB_rad = p.radians(angleB_deg);

        // 位置Pの計算
        if (angleA_deg + angleB_deg >= 180) {
            p.push();
            p.scale(1, -1); // テキスト描画のためY軸を元に戻す
            p.fill(255, 0, 0); p.noStroke(); p.textAlign(p.CENTER);
            p.text("エラー: 角度の合計が180°を超えています", c_dist / 2, 20);
            p.pop();
            resultSpan.html("エラー: 角度の合計が180°を超えています");
            return;
        }

        let tanA = p.tan(angleA_rad);
        let tanB = p.tan(angleB_rad);
        
        let posX = c_dist * tanB / (tanA + tanB);
        let posY = tanA * posX;
        
        // 距離 a, b を計算
        let b = p.sqrt(posX * posX + posY * posY); // Dist AP
        let a = p.sqrt(p.pow(posX - c_dist, 2) + p.pow(posY, 2)); // Dist BP

        // ▼▼▼ 結果表示を修正 (MathJaxデリミタ使用) ▼▼▼
        resultSpan.html(`\\( P: (x, y) = (b \\cos(\\theta_A), b \\sin(\\theta_A)) \\)<br>
                        \\( = (${b.toFixed(1)} \\cos(${angleA_deg}^\\circ), ${b.toFixed(1)} \\sin(${angleA_deg}^\\circ)) \\)<br>
                        \\( = (${posX.toFixed(1)}, ${posY.toFixed(1)}) \\)`);
        
        // MathJaxに再レンダリングを指示
        if (window.MathJax) {
            setTimeout(() => {
                if (window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise([resultSpan.elt])
                        .catch((err) => console.error('MathJax Typesetting failed:', err));
                } else if (window.MathJax.Hub) {
                     window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub, resultSpan.elt]);
                }
            }, 0);
        }
        // ▲▲▲ 修正ここまで ▲▲▲

        // --- 描画 ---
        
        // 塔
        p.fill(0); p.noStroke();
        p.ellipse(towerA.x, towerA.y, 10, 10);
        p.ellipse(towerB.x, towerB.y, 10, 10);
        
        // 基線
        p.stroke(100); p.strokeWeight(2);
        p.line(towerA.x, towerA.y, towerB.x, towerB.y);

        // 位置 P
        p.fill(229, 57, 53); p.noStroke();
        p.ellipse(posX, posY, 10, 10);

        // 線
        p.stroke(0, 0, 200, 100); p.strokeWeight(1);
        p.line(towerA.x, towerA.y, posX, posY);
        p.line(towerB.x, towerB.y, posX, posY);
        
        // 角度の円弧 (Y反転・数学座標系バージョン)
        p.noFill(); p.stroke(100);
        p.arc(towerA.x, towerA.y, 50, 50, 0, angleA_rad); 
        p.arc(towerB.x, towerB.y, 50, 50, p.PI - angleB_rad, p.PI);
        
        // ▼▼▼ 修正: テキスト描画 (ローカルでY軸を再反転) ▼▼▼
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER); p.textSize(12);

        // 塔A ラベル
        p.push();
        p.translate(towerA.x, towerA.y);
        p.scale(1, -1); // Y軸を元に戻す
        p.text("塔 A", 0, 15); // Y+15 (下)
        p.pop();
        
        // 塔B ラベル
        p.push();
        p.translate(towerB.x, towerB.y);
        p.scale(1, -1);
        p.text("塔 B", 0, 15); // Y+15 (下)
        p.pop();

        // 基線c ラベル
        p.push();
        p.translate(c_dist / 2, 0);
        p.scale(1, -1);
        p.text(`c = ${c_dist}`, 0, 15); // Y+15 (下)
        p.pop();

        // P(あなた) ラベル
        p.push();
        p.translate(posX, posY);
        p.scale(1, -1);
        p.text("P (あなた)", 0, -10); // Y-10 (上)
        p.pop();
        
        // 距離 a, b のラベル
        // Label 'b' (midpoint of AP)
        p.push();
        p.translate(posX / 2, posY / 2); // Midpoint AP
        p.rotate(p.atan2(posY, posX)); // 線の角度に合わせる
        p.scale(1, -1); // Y軸を元に戻す
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.BOTTOM);
        p.text(`b = ${b.toFixed(1)}`, 0, -5); // 線の上に表示
        p.pop();

        // Label 'a' (midpoint of BP)
        p.push();
        p.translate((posX + c_dist) / 2, posY / 2); // Midpoint BP
        p.rotate(p.atan2(posY, posX - c_dist)); // 線の角度に合わせる
        p.scale(1, -1); // Y軸を元に戻す
        p.fill(0); p.noStroke(); p.textAlign(p.CENTER, p.BOTTOM);
        p.text(`a = ${a.toFixed(1)}`, 0, -5); // 線の上に表示
        p.pop();
        // ▲▲▲ 修正ここまで ▲▲▲
    };
};


// --- DOM読み込み完了時にすべてのスケッチを開始 ---
document.addEventListener('DOMContentLoaded', () => {
    // ▼ 6つのスケッチをすべて初期化 ▼
    if (document.getElementById('parabolic-canvas-holder')) {
        new p5(sketchParabolic);
    }
    if (document.getElementById('circular-motion-canvas-holder')) {
        new p5(sketchCircularMotion);
    }
    if (document.getElementById('shm-canvas-holder')) {
        new p5(sketchSHM);
    }
    if (document.getElementById('lighting-canvas-holder')) {
        new p5(sketchLighting);
    }
    if (document.getElementById('sine-wave-canvas-holder')) {
        new p5(sketchSineWaves);
    }
    if (document.getElementById('triangulation-canvas-holder')) { // ▼ 新規追加 ▼
        new p5(sketchTriangulation);
    }

    // --- 円運動と単振動のスライダーを連動させる ---
    const cmAmpX = document.getElementById('cm-amplitude-x');
    const shmAmp = document.getElementById('shm-amplitude');
    const cmOmega = document.getElementById('cm-omega');
    const shmOmega = document.getElementById('shm-omega');

    function syncValues(source, target) {
        if (source && target) {
            target.value = source.value;
        }
    }
    
    // スライダーの存在を確認してからイベントリスナーを追加
    if (cmAmpX && shmAmp) {
        // ▼ cm-amplitude-x が shm-amplitude を制御する
        cmAmpX.addEventListener('input', () => {
            syncValues(cmAmpX, shmAmp);
            // shm-amplitude のスパンも手動で更新
            const shmSpan = document.getElementById('shm-amplitudeValue');
            if (shmSpan) shmSpan.innerHTML = parseFloat(cmAmpX.value).toFixed(0);
        });
        // ▼ shm-amplitude が cm-amplitude-x を制御する
        shmAmp.addEventListener('input', () => {
             syncValues(shmAmp, cmAmpX);
             // cm-amplitude-x のスパンも手動で更新
             const cmSpan = document.getElementById('cm-amplitude-xValue');
             if (cmSpan) cmSpan.innerHTML = parseFloat(shmAmp.value).toFixed(0);
        });
    }
    if (cmOmega && shmOmega) {
        // ▼ cm-omega が shm-omega を制御する
        cmOmega.addEventListener('input', () => {
             syncValues(cmOmega, shmOmega);
             const shmSpan = document.getElementById('shm-omegaValue');
             if (shmSpan) shmSpan.innerHTML = parseFloat(cmOmega.value).toFixed(1);
        });
        // ▼ shm-omega が cm-omega を制御する
        shmOmega.addEventListener('input', () => {
             syncValues(shmOmega, cmOmega);
             const cmSpan = document.getElementById('cm-omegaValue');
             if (cmSpan) cmSpan.innerHTML = parseFloat(shmOmega.value).toFixed(1);
        });
    }
});