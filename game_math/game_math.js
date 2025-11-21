/**
 * ゲーム数学：内積の応用デモ
 * 1. 視界判定 (Stealth Game)
 * 2. 背後攻撃判定 (Back Attack)
 */

// --- 1. 視界判定 (Stealth Game) ---
const sketchStealth = (p) => {
    let enemyPos;
    let playerPos;
    let enemyDirAngle = 0; // 敵の向き (度)
    let fovAngle = 60;     // 視野角 (度)
    const viewRadius = 180; // 視界の距離
    
    // UI要素
    let fovSlider, rotSlider, fovSpan, rotSpan, statusDiv;
    let cosAlphaSpan, thresholdSpan, distCheckSpan;

    p.setup = () => {
        let canvas = p.createCanvas(500, 350);
        canvas.parent('stealth-canvas-holder');
        
        enemyPos = p.createVector(p.width / 2, p.height / 2);
        playerPos = p.createVector(p.width / 2, 50); // 初期位置

        // UI取得
        fovSlider = p.select('#fov-angle');
        rotSlider = p.select('#enemy-rotation');
        fovSpan = p.select('#fov-angle-val');
        rotSpan = p.select('#enemy-rotation-val');
        statusDiv = p.select('#stealth-status');
        
        cosAlphaSpan = p.select('#current-cos');
        thresholdSpan = p.select('#threshold-cos');
        distCheckSpan = p.select('#dist-check');

        // イベントリスナー
        fovSlider.input(() => p.redraw());
        rotSlider.input(() => p.redraw());
        
        p.noLoop();
    };

    p.draw = () => {
        p.background(255);
        
        // パラメータ更新
        fovAngle = parseFloat(fovSlider.value());
        enemyDirAngle = parseFloat(rotSlider.value());
        
        fovSpan.html(`${fovAngle}°`);
        rotSpan.html(`${enemyDirAngle}°`);

        // マウス追従
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
             playerPos.set(p.mouseX, p.mouseY);
        }

        // --- 計算処理 ---
        
        // 1. 敵の向きベクトル u (単位ベクトル)
        let u = p5.Vector.fromAngle(p.radians(enemyDirAngle));
        
        // 2. 敵からプレイヤーへのベクトル v
        let v = p5.Vector.sub(playerPos, enemyPos);
        let dist = v.mag(); // 距離 |v|
        
        // 3. 内積とコサインの計算
        // cos(α) = (u . v) / (|u||v|)
        let cosAlpha = 0;
        if (dist > 0) {
            cosAlpha = u.dot(v) / dist;
        }
        
        // 4. 閾値 (cos(θ/2))
        let threshold = p.cos(p.radians(fovAngle / 2));
        
        // 判定
        let isWithinDist = dist <= viewRadius;
        let isWithinAngle = cosAlpha >= threshold;
        let detected = isWithinDist && isWithinAngle;

        // --- UI数値更新 ---
        cosAlphaSpan.html(cosAlpha.toFixed(3));
        thresholdSpan.html(threshold.toFixed(3));
        
        if (isWithinDist) {
            distCheckSpan.html("OK (範囲内)").style('color', '#2e7d32');
        } else {
            distCheckSpan.html("NG (遠い)").style('color', '#c62828');
        }

        if (isWithinAngle) {
            cosAlphaSpan.style('color', '#2e7d32'); // 緑
        } else {
            cosAlphaSpan.style('color', '#c62828'); // 赤
        }

        // ステータス表示
        if (detected) {
            statusDiv.html("⚠️ 発見されました！ (FOUND!)");
            statusDiv.class("status-display status-found");
        } else {
            statusDiv.html("隠れています (HIDDEN)");
            statusDiv.class("status-display status-safe");
        }

        // --- 描画処理 ---
        p.translate(enemyPos.x, enemyPos.y);

        // 1. 距離判定円
        p.noFill();
        p.stroke(180);
        p.drawingContext.setLineDash([5, 5]);
        p.ellipse(0, 0, viewRadius * 2);
        p.drawingContext.setLineDash([]); 
        p.fill(150); p.noStroke(); p.textSize(10);
        p.text(`距離 R`, viewRadius + 5, 0);

        // 2. 視界の扇形 (FOV)
        p.noStroke();
        if (detected) p.fill(255, 0, 0, 50); // 発見時は赤
        else p.fill(0, 0, 255, 30);          // 通常は青
        
        p.arc(0, 0, viewRadius * 2, viewRadius * 2, 
              p.radians(enemyDirAngle - fovAngle / 2), 
              p.radians(enemyDirAngle + fovAngle / 2), p.PIE);

        // 3. 角度 α
        if (dist > 0) {
            let playerAngle = v.heading();
            let diff = playerAngle - p.radians(enemyDirAngle);
            while (diff <= -p.PI) diff += 2*p.PI;
            while (diff > p.PI) diff -= 2*p.PI;
            
            p.noFill();
            p.stroke(255, 193, 7, 200); // アンバー
            p.strokeWeight(3);
            p.arc(0, 0, 60, 60, p.radians(enemyDirAngle), p.radians(enemyDirAngle) + diff);
            
            p.noStroke();
            p.fill(230, 81, 0);
            let midAngle = p.radians(enemyDirAngle) + diff / 2;
            p.text("α", 40 * p.cos(midAngle), 40 * p.sin(midAngle));
        }

        // 4. 敵の向きベクトル u
        drawArrow(p, p.createVector(0,0), u.copy().mult(50), '#333');
        p.noStroke(); p.fill(0);
        p.text("u", 55 * u.x, 55 * u.y);

        // 5. 敵キャラクター
        p.rotate(p.radians(enemyDirAngle));
        drawCharacter(p, 0, 0, '#333', 'Enemy');
        p.rotate(-p.radians(enemyDirAngle));

        // 6. プレイヤーへのベクトル線 v
        p.stroke(150);
        p.strokeWeight(1);
        p.line(0, 0, v.x, v.y);

        // 7. プレイヤー
        p.translate(v.x, v.y);
        p.fill(30, 136, 229); // 青
        p.noStroke();
        p.ellipse(0, 0, 15, 15);
        p.fill(0);
        p.textAlign(p.CENTER, p.TOP);
        p.text("Player", 0, 10);
    };
    
    p.mouseMoved = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            p.redraw();
        }
    };
};


// --- 2. 背後攻撃判定 (Back Attack) ---
const sketchBackstab = (p) => {
    let enemyPos;
    let playerPos;
    let enemyDirAngle = 270; // 上向き
    let backAngle = 120;     // 背後判定角度
    const attackDist = 60;   // 攻撃有効距離
    
    // UI
    let angleSlider, angleSpan, statusDiv;
    let cosAlphaSpan, thresholdSpan, distCheckSpan;

    p.setup = () => {
        let canvas = p.createCanvas(500, 350);
        canvas.parent('backstab-canvas-holder');
        
        enemyPos = p.createVector(p.width / 2, p.height / 2);
        playerPos = p.createVector(p.width / 2, p.height / 2 + 50); 

        angleSlider = p.select('#back-angle');
        angleSpan = p.select('#back-angle-val');
        statusDiv = p.select('#backstab-status');
        
        // 数値表示用要素取得
        cosAlphaSpan = p.select('#bs-current-cos');
        thresholdSpan = p.select('#bs-threshold-cos');
        distCheckSpan = p.select('#bs-dist-check');

        angleSlider.input(() => p.redraw());
        
        p.noLoop();
    };

    p.draw = () => {
        p.background(255);
        
        backAngle = parseFloat(angleSlider.value());
        angleSpan.html(`${backAngle}°`);

        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
             playerPos.set(p.mouseX, p.mouseY);
        }

        // --- 計算処理 ---
        let u = p5.Vector.fromAngle(p.radians(enemyDirAngle));
        let v = p5.Vector.sub(playerPos, enemyPos);
        let dist = v.mag();

        // 判定
        let cosAlpha = 0;
        if (dist > 0) cosAlpha = u.dot(v) / dist;

        // 閾値: 180度から「背後許容角の半分」を引いた角度のコサイン
        let thresholdAngle = 180 - (backAngle / 2); 
        let threshold = p.cos(p.radians(thresholdAngle));
        
        // 条件: cos(alpha) <= threshold
        let isBackAngle = cosAlpha <= threshold;
        let isHitDist = dist <= attackDist + 20;

        // --- UI数値更新 ---
        cosAlphaSpan.html(cosAlpha.toFixed(3));
        thresholdSpan.html(threshold.toFixed(3));
        
        if (isHitDist) {
            distCheckSpan.html("OK (射程内)").style('color', '#2e7d32');
        } else {
            distCheckSpan.html("NG (遠い)").style('color', '#c62828');
        }

        if (isBackAngle) {
            cosAlphaSpan.style('color', '#2e7d32'); // 緑
        } else {
            cosAlphaSpan.style('color', '#c62828'); // 赤
        }

        // ステータス更新
        if (isHitDist && isBackAngle) {
            statusDiv.html("⚔️ CRITICAL HIT!! (背後攻撃)");
            statusDiv.class("status-display status-critical");
        } else if (isHitDist) {
            statusDiv.html("通常ダメージ (正面・側面)");
            statusDiv.class("status-display status-safe");
        } else {
            statusDiv.html("攻撃範囲外");
            statusDiv.class("status-display");
        }

        // --- 描画 ---
        p.translate(enemyPos.x, enemyPos.y);

        // 1. 距離判定円
        p.noFill();
        p.stroke(180);
        p.drawingContext.setLineDash([5, 5]);
        p.ellipse(0, 0, (attackDist + 20) * 2);
        p.drawingContext.setLineDash([]);
        
        // 2. 背後エリア表示 (黄色いゾーン)
        p.noStroke();
        p.fill(255, 200, 0, 50); 
        let halfBack = backAngle / 2;
        p.arc(0, 0, 200, 200, 
              p.radians(enemyDirAngle + 180 - halfBack), 
              p.radians(enemyDirAngle + 180 + halfBack), p.PIE);

        // 3. 角度 α の表示
        if (dist > 0) {
            let playerAngle = v.heading();
            let diff = playerAngle - p.radians(enemyDirAngle);
            while (diff <= -p.PI) diff += 2*p.PI;
            while (diff > p.PI) diff -= 2*p.PI;
            
            p.noFill();
            p.stroke(255, 193, 7, 200);
            p.strokeWeight(3);
            p.arc(0, 0, 60, 60, p.radians(enemyDirAngle), p.radians(enemyDirAngle) + diff);
            
            p.noStroke();
            p.fill(230, 81, 0);
            let midAngle = p.radians(enemyDirAngle) + diff / 2;
            p.text("α", 40 * p.cos(midAngle), 40 * p.sin(midAngle));
        }

        // 4. 敵の向きベクトル u
        drawArrow(p, p.createVector(0,0), u.copy().mult(50), '#333');
        p.noStroke(); p.fill(0);
        p.text("u", 55 * u.x, 55 * u.y);

        // 5. 敵キャラクター
        p.rotate(p.radians(enemyDirAngle));
        drawCharacter(p, 0, 0, '#D32F2F', 'Enemy');
        p.rotate(-p.radians(enemyDirAngle));

        // 6. プレイヤーへのベクトル線
        p.stroke(150); p.strokeWeight(1);
        p.line(0, 0, v.x, v.y);

        // 7. プレイヤー
        p.translate(v.x, v.y);
        let playerDir = p5.Vector.sub(p.createVector(0,0), v).heading();
        p.rotate(playerDir);
        
        // 剣アイコン
        p.stroke(0);
        if (isHitDist && isBackAngle) p.fill(255, 150, 0); // クリティカル
        else p.fill(200);
        p.triangle(15, 0, -10, 8, -10, -8); 
        p.fill(50);
        p.ellipse(0, 0, 10, 10); 
        
        p.rotate(-playerDir);
        p.translate(-v.x, -v.y);
    };
    
    p.mouseMoved = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            p.redraw();
        }
    };
};

// --- 共通ヘルパー ---
function drawCharacter(p, x, y, color, label) {
    p.push();
    p.translate(x, y);
    p.fill(color);
    p.noStroke();
    p.ellipse(0, 0, 30, 30);
    p.fill(255);
    p.ellipse(10, -5, 8, 8); // 右目
    p.ellipse(10, 5, 8, 8);  // 左目
    p.fill(0);
    p.textAlign(p.CENTER);
    p.text(label, 0, 30);
    p.pop();
}

function drawArrow(p, base, vec, color) {
    p.push();
    p.stroke(color);
    p.strokeWeight(2);
    p.fill(color);
    p.translate(base.x, base.y);
    p.line(0, 0, vec.x, vec.y);
    p.rotate(vec.heading());
    let arrowSize = 7;
    p.translate(vec.mag() - arrowSize, 0);
    p.triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    p.pop();
}

// --- DOM読み込み完了時にスケッチ開始 ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('stealth-canvas-holder')) {
        new p5(sketchStealth);
    }
    if (document.getElementById('backstab-canvas-holder')) {
        new p5(sketchBackstab);
    }
});