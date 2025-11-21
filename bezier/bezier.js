/**
 * ベジェ曲線シミュレーター用スクリプト
 * 1次、2次、3次、N次の各スケッチを定義
 */

// --- 共通クラス: ドラッグ可能な点 ---
class DraggablePoint {
    constructor(p, x, y, label) {
        this.p = p;
        this.pos = p.createVector(x, y);
        this.label = label;
        this.isDragging = false;
        this.radius = 12; // ヒット判定用半径
    }

    display(isAnchor = true) {
        const p = this.p;
        p.push();
        p.translate(this.pos.x, this.pos.y);
        
        // 点の描画
        if (isAnchor) {
            p.fill(0); // アンカーポイントは黒
            p.rectMode(p.CENTER);
            p.noStroke();
            p.rect(0, 0, 10, 10);
        } else {
            p.fill(255); // ハンドル制御点は白抜き
            p.stroke(0);
            p.strokeWeight(1);
            p.ellipse(0, 0, 10, 10);
        }

        // ラベル
        p.fill(0);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(this.label, 8, -8);
        p.pop();
    }

    checkPressed() {
        if (this.p.dist(this.p.mouseX, this.p.mouseY, this.pos.x, this.pos.y) < this.radius) {
            this.isDragging = true;
            return true;
        }
        return false;
    }

    update() {
        if (this.isDragging) {
            this.pos.x = this.p.constrain(this.p.mouseX, 0, this.p.width);
            this.pos.y = this.p.constrain(this.p.mouseY, 0, this.p.height);
        }
    }

    release() {
        this.isDragging = false;
    }
}


// --- 1. 1次ベジェ曲線 (Linear) ---
const sketchLinear = (p) => {
    let pts = [];
    let t = 0;
    let isPlaying = false;
    
    let sliderT, valT, btnPlay;

    p.setup = () => {
        let canvas = p.createCanvas(600, 200);
        canvas.parent('canvas-linear');
        
        // UI取得
        sliderT = p.select('#slider-t-1');
        valT = p.select('#val-t-1');
        btnPlay = p.select('#btn-play-1');

        // イベント
        sliderT.input(() => {
            t = parseFloat(sliderT.value());
            isPlaying = false; // 手動操作時は停止
            btnPlay.removeClass('playing');
        });
        btnPlay.mousePressed(togglePlay);

        // 初期点 P0, P1
        pts.push(new DraggablePoint(p, 100, 150, "P0"));
        pts.push(new DraggablePoint(p, 500, 50, "P1"));
        
        // 初期再生
        togglePlay();
    };
    
    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) btnPlay.addClass('playing');
        else btnPlay.removeClass('playing');
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += 0.005;
            if (t > 1) t = 0;
            sliderT.value(t);
        }
        valT.html(t.toFixed(2));

        // 線分描画
        p.stroke(200); p.strokeWeight(2);
        p.line(pts[0].pos.x, pts[0].pos.y, pts[1].pos.x, pts[1].pos.y);

        // 補間点 P01
        let p01 = p5.Vector.lerp(pts[0].pos, pts[1].pos, t);
        
        // 軌跡（全体）
        p.stroke(30, 136, 229); p.strokeWeight(3);
        p.line(pts[0].pos.x, pts[0].pos.y, pts[1].pos.x, pts[1].pos.y);

        // 動く点
        p.fill(229, 57, 53); p.noStroke();
        p.ellipse(p01.x, p01.y, 8, 8);
        p.fill(0); p.text(`P01(t)`, p01.x + 10, p01.y - 10);

        // 制御点の更新と描画
        pts.forEach(pt => { pt.update(); pt.display(); });
    };

    p.mousePressed = () => { pts.forEach(pt => pt.checkPressed()); };
    p.mouseReleased = () => { pts.forEach(pt => pt.release()); };
};


// --- 2. 2次ベジェ曲線 (Quadratic) ---
const sketchQuadratic = (p) => {
    let pts = [];
    let t = 0;
    let isPlaying = false;
    
    let sliderT, valT, btnPlay;

    p.setup = () => {
        let canvas = p.createCanvas(600, 300);
        canvas.parent('canvas-quadratic');
        
        sliderT = p.select('#slider-t-2');
        valT = p.select('#val-t-2');
        btnPlay = p.select('#btn-play-2');

        sliderT.input(() => {
            t = parseFloat(sliderT.value());
            isPlaying = false;
            btnPlay.removeClass('playing');
        });
        btnPlay.mousePressed(togglePlay);

        pts.push(new DraggablePoint(p, 100, 250, "P0"));
        pts.push(new DraggablePoint(p, 300, 50, "P1"));
        pts.push(new DraggablePoint(p, 500, 250, "P2"));

        togglePlay();
    };
    
    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) btnPlay.addClass('playing');
        else btnPlay.removeClass('playing');
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += 0.005;
            if (t > 1) t = 0;
            sliderT.value(t);
        }
        valT.html(t.toFixed(2));

        // 制御線 (ハンドル)
        p.stroke(200); p.strokeWeight(1);
        p.line(pts[0].pos.x, pts[0].pos.y, pts[1].pos.x, pts[1].pos.y);
        p.line(pts[1].pos.x, pts[1].pos.y, pts[2].pos.x, pts[2].pos.y);

        // ベジェ曲線本体の描画
        p.noFill(); p.stroke(30, 136, 229); p.strokeWeight(3);
        p.beginShape();
        for (let i = 0; i <= 1; i += 0.02) {
            let b0 = (1-i)*(1-i);
            let b1 = 2*(1-i)*i;
            let b2 = i*i;
            let px = b0*pts[0].pos.x + b1*pts[1].pos.x + b2*pts[2].pos.x;
            let py = b0*pts[0].pos.y + b1*pts[1].pos.y + b2*pts[2].pos.y;
            p.vertex(px, py);
        }
        p.endShape();

        // ド・カステリョのアルゴリズム可視化
        let p01 = p5.Vector.lerp(pts[0].pos, pts[1].pos, t);
        let p12 = p5.Vector.lerp(pts[1].pos, pts[2].pos, t);
        
        p.stroke(100, 200, 100); p.strokeWeight(1.5); // 緑色
        p.line(p01.x, p01.y, p12.x, p12.y);
        
        p.fill(100, 200, 100); p.noStroke();
        p.ellipse(p01.x, p01.y, 5, 5);
        p.ellipse(p12.x, p12.y, 5, 5);

        // 第2段階 (描画点)
        let p012 = p5.Vector.lerp(p01, p12, t);
        
        p.fill(229, 57, 53); p.noStroke();
        p.ellipse(p012.x, p012.y, 8, 8);
        p.fill(0); 
        p.text("P01", p01.x, p01.y-10);
        p.text("P12", p12.x, p12.y-10);
        p.text("P012(t)", p012.x+10, p012.y);

        pts[0].display(true);
        pts[1].display(false);
        pts[2].display(true);
        pts.forEach(pt => pt.update());
    };

    p.mousePressed = () => { pts.forEach(pt => pt.checkPressed()); };
    p.mouseReleased = () => { pts.forEach(pt => pt.release()); };
};


// --- 3. 3次ベジェ曲線 (Cubic) ---
const sketchCubic = (p) => {
    let pts = [];
    let t = 0;
    let isPlaying = false;
    
    let sliderT, valT, btnPlay, chkConstruction;

    p.setup = () => {
        let canvas = p.createCanvas(600, 350);
        canvas.parent('canvas-cubic');
        
        sliderT = p.select('#slider-t-3');
        valT = p.select('#val-t-3');
        btnPlay = p.select('#btn-play-3');
        chkConstruction = p.select('#chk-construction');

        sliderT.input(() => {
            t = parseFloat(sliderT.value());
            isPlaying = false;
            btnPlay.removeClass('playing');
        });
        btnPlay.mousePressed(togglePlay);

        pts.push(new DraggablePoint(p, 50, 300, "P0"));
        pts.push(new DraggablePoint(p, 150, 50, "P1"));
        pts.push(new DraggablePoint(p, 450, 50, "P2"));
        pts.push(new DraggablePoint(p, 550, 300, "P3"));
        
        togglePlay();
    };
    
    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) btnPlay.addClass('playing');
        else btnPlay.removeClass('playing');
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += 0.003; // 少しゆっくり
            if (t > 1) t = 0;
            sliderT.value(t);
        }
        valT.html(t.toFixed(2));

        // 制御線
        p.stroke(200); p.strokeWeight(1);
        p.line(pts[0].pos.x, pts[0].pos.y, pts[1].pos.x, pts[1].pos.y);
        p.line(pts[1].pos.x, pts[1].pos.y, pts[2].pos.x, pts[2].pos.y);
        p.line(pts[2].pos.x, pts[2].pos.y, pts[3].pos.x, pts[3].pos.y);

        // ベジェ曲線
        p.noFill(); p.stroke(30, 136, 229); p.strokeWeight(3);
        p.bezier(pts[0].pos.x, pts[0].pos.y, pts[1].pos.x, pts[1].pos.y, pts[2].pos.x, pts[2].pos.y, pts[3].pos.x, pts[3].pos.y);

        if (chkConstruction.checked()) {
            // 第1段階 (3本)
            let p01 = p5.Vector.lerp(pts[0].pos, pts[1].pos, t);
            let p12 = p5.Vector.lerp(pts[1].pos, pts[2].pos, t);
            let p23 = p5.Vector.lerp(pts[2].pos, pts[3].pos, t);

            p.stroke(180, 220, 180); p.strokeWeight(1);
            p.line(p01.x, p01.y, p12.x, p12.y);
            p.line(p12.x, p12.y, p23.x, p23.y);

            // 第2段階 (2本)
            let p012 = p5.Vector.lerp(p01, p12, t);
            let p123 = p5.Vector.lerp(p12, p23, t);

            p.stroke(100, 200, 100); p.strokeWeight(1.5);
            p.line(p012.x, p012.y, p123.x, p123.y);

            // 第3段階 (最終点)
            let pFinal = p5.Vector.lerp(p012, p123, t);

            p.fill(229, 57, 53); p.noStroke();
            p.ellipse(pFinal.x, pFinal.y, 8, 8);
            
            // ラベル
            p.fill(100); p.textSize(10);
            p.text("P01", p01.x, p01.y); p.text("P12", p12.x, p12.y); p.text("P23", p23.x, p23.y);
            p.fill(0); p.textSize(12);
            p.text("P0123(t)", pFinal.x + 10, pFinal.y);
        }

        pts[0].display(true);
        pts[1].display(false);
        pts[2].display(false);
        pts[3].display(true);
        pts.forEach(pt => pt.update());
    };

    p.mousePressed = () => { pts.forEach(pt => pt.checkPressed()); };
    p.mouseReleased = () => { pts.forEach(pt => pt.release()); };
};


// --- 4. N次ベジェ曲線 (General) ---
const sketchNDegree = (p) => {
    let pts = [];
    let t = 0;
    let isPlaying = false;

    let sliderT, valT, btnPlay;
    let btnAdd, btnRemove, btnReset;
    let spanCount;

    p.setup = () => {
        let canvas = p.createCanvas(600, 400);
        canvas.parent('canvas-n-degree');
        
        sliderT = p.select('#slider-t-n');
        valT = p.select('#val-t-n');
        btnPlay = p.select('#btn-play-n');
        
        btnAdd = p.select('#btn-add-point');
        btnRemove = p.select('#btn-remove-point');
        btnReset = p.select('#btn-reset');
        spanCount = p.select('#point-count');

        sliderT.input(() => {
            t = parseFloat(sliderT.value());
            isPlaying = false;
            btnPlay.removeClass('playing');
        });
        btnPlay.mousePressed(togglePlay);

        btnAdd.mousePressed(addPoint);
        btnRemove.mousePressed(removePoint);
        btnReset.mousePressed(resetPoints);

        resetPoints(); // 初期化
        togglePlay();
    };

    function togglePlay() {
        isPlaying = !isPlaying;
        if (isPlaying) btnPlay.addClass('playing');
        else btnPlay.removeClass('playing');
    }

    function resetPoints() {
        pts = [];
        // 4次 (5点) の例
        pts.push(new DraggablePoint(p, 50, 350, "P0"));
        pts.push(new DraggablePoint(p, 100, 100, "P1"));
        pts.push(new DraggablePoint(p, 300, 50, "P2"));
        pts.push(new DraggablePoint(p, 500, 100, "P3"));
        pts.push(new DraggablePoint(p, 550, 350, "P4"));
        updateCount();
    }

    function addPoint() {
        if (pts.length < 15) {
            let last = pts[pts.length-1];
            pts.push(new DraggablePoint(p, last.pos.x + 30, last.pos.y + 30, `P${pts.length}`));
            updateCount();
        }
    }

    function removePoint() {
        if (pts.length > 2) {
            pts.pop();
            updateCount();
        }
    }

    function updateCount() {
        spanCount.html(`次数: ${pts.length - 1}次 (点${pts.length}個)`);
        // ラベル振り直し
        pts.forEach((pt, i) => pt.label = `P${i}`);
    }

    // 再帰的なド・カステリョアルゴリズム
    function deCasteljau(points, t) {
        if (points.length === 1) {
            return points[0];
        }
        
        let nextPoints = [];
        for (let i = 0; i < points.length - 1; i++) {
            // 線を描画 (補助線)
            if (points.length === pts.length) { // 最初のレベル
                 p.stroke(220); p.strokeWeight(1);
            } else { // 中間レベル
                 p.stroke(100, 200, 100, 100); p.strokeWeight(1);
            }
            p.line(points[i].x, points[i].y, points[i+1].x, points[i+1].y);

            // 補間点
            let x = (1 - t) * points[i].x + t * points[i+1].x;
            let y = (1 - t) * points[i].y + t * points[i+1].y;
            nextPoints.push(p.createVector(x, y));
            
            // 補間点の描画
            if (points.length < pts.length) {
                p.fill(100, 200, 100); p.noStroke();
                p.ellipse(x, y, 4, 4);
            }
        }
        return deCasteljau(nextPoints, t);
    }

    p.draw = () => {
        p.background(255);
        
        if (isPlaying) {
            t += 0.003;
            if (t > 1) t = 0;
            sliderT.value(t);
        }
        valT.html(t.toFixed(2));

        // 1. 軌跡 (サンプリング)
        p.noFill(); p.stroke(30, 136, 229); p.strokeWeight(3);
        p.beginShape();
        let steps = 100;
        for (let i = 0; i <= steps; i++) {
            let tt = i / steps;
            let pos = evaluateBezier(pts, tt);
            p.vertex(pos.x, pos.y);
        }
        p.endShape();

        // 2. アニメーション (ド・カステリョ)
        let currentPosVectors = pts.map(pt => pt.pos);
        let finalPoint = deCasteljau(currentPosVectors, t);

        // 最終点
        p.fill(229, 57, 53); p.noStroke();
        p.ellipse(finalPoint.x, finalPoint.y, 10, 10);

        // 制御点
        pts.forEach((pt, i) => {
            let isAnchor = (i === 0 || i === pts.length - 1);
            pt.display(isAnchor);
            pt.update();
        });
    };

    // バーンスタイン基底関数によるベジェ曲線計算
    function evaluateBezier(points, t) {
        let n = points.length - 1;
        let x = 0;
        let y = 0;
        for (let i = 0; i <= n; i++) {
            let b = combinations(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
            x += points[i].pos.x * b;
            y += points[i].pos.y * b;
        }
        return p.createVector(x, y);
    }

    function combinations(n, r) {
        if (r < 0 || r > n) return 0;
        if (r === 0 || r === n) return 1;
        if (r > n / 2) r = n - r;
        let res = 1;
        for (let i = 1; i <= r; i++) {
            res = res * (n - i + 1) / i;
        }
        return res;
    }

    p.mousePressed = () => { pts.forEach(pt => pt.checkPressed()); };
    p.mouseReleased = () => { pts.forEach(pt => pt.release()); };
};


// --- DOM読み込み完了時にすべてのスケッチを開始 ---
document.addEventListener('DOMContentLoaded', () => {
    new p5(sketchLinear);
    new p5(sketchQuadratic);
    new p5(sketchCubic);
    new p5(sketchNDegree);
});