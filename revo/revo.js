// --- グローバル変数 ---
let p5sketch;
let resultsData = []; // { month, payment, interest, principal, additional, balance }
let totalDebt = 0;

// --- DOM読み込み完了時の処理 ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calculateButton').addEventListener('click', runSimulation);
    p5sketch = new p5(sketch);
});

// --- シミュレーション実行 ---
function runSimulation() {
    // 1. UIから値を取得
    totalDebt = parseFloat(document.getElementById('totalDebt').value) || 0;
    const apr = (parseFloat(document.getElementById('apr').value) || 15.0) / 100;
    const monthlyPayment = parseFloat(document.getElementById('monthlyPayment').value) || 10000;
    const additionalSpending = parseFloat(document.getElementById('additionalSpending').value) || 0;
    const maxMonths = parseInt(document.getElementById('maxMonths').value) || 120;

    // 2. 計算ロジック
    resultsData = []; // 結果配列をリセット
    let currentDebt = totalDebt;
    let totalInterestPaid = 0;
    let month = 0;
    let isCompleted = false;

    while (month < maxMonths && currentDebt > 0) {
        month++;
        
        // 利息計算
        const monthlyInterest = currentDebt * (apr / 12);
        totalInterestPaid += monthlyInterest;
        
        // 元金充当額
        const principalRepayment = monthlyPayment - monthlyInterest;
        
        // 残高更新
        currentDebt = currentDebt - principalRepayment;
        
        // ▼ 危険な状態のチェック (元金が減らない or 増える)
        const isDanger = principalRepayment <= additionalSpending;

        // 月末に追加利用
        currentDebt += additionalSpending;
        
        // 借金がゼロになったら終了
        if (currentDebt <= 0) {
            currentDebt = 0;
            isCompleted = true;
        }

        resultsData.push({
            month: month,
            payment: monthlyPayment,
            interest: monthlyInterest,
            principal: principalRepayment,
            additional: additionalSpending,
            balance: currentDebt,
            isDanger: isDanger && !isCompleted // 完済月は危険としない
        });

        if (isCompleted) break;
    }

    // 3. 結果の表示
    renderSummary(totalInterestPaid, month, currentDebt, isCompleted, maxMonths);
    renderTable();
    p5sketch.redraw(); // p5.jsのdraw関数を呼び出す
    document.getElementById('results').classList.remove('hidden');
}

// --- サマリーの描画 ---
function renderSummary(totalInterest, months, finalBalance, isCompleted, maxMonths) {
    const summaryDiv = document.getElementById('summary');
    if (isCompleted) {
        summaryDiv.className = 'complete';
        summaryDiv.innerHTML = `
            <b>完済しました！</b><br>
            返済期間: <span>${months}</span> ヶ月 (${(months / 12).toFixed(1)} 年)<br>
            利息総額: <span>${totalInterest.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
        `;
    } else {
        summaryDiv.className = 'incomplete';
        summaryDiv.innerHTML = `
            <b>${maxMonths}ヶ月以内に完済できませんでした。</b><br>
            シミュレーション終了時の残高: <span>${finalBalance.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span><br>
            支払った利息総額: <span>${totalInterest.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })}</span>
        `;
    }
}

// --- 表の描画 ---
function renderTable() {
    const table = document.getElementById('results-table');
    table.innerHTML = ''; // 表をクリア
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    thead.innerHTML = `
        <tr>
            <th>月</th>
            <th>返済額(A)</th>
            <th>利息(B)</th>
            <th>元金充当(A-B)</th>
            <th>追加利用(C)</th>
            <th>月末残高</th>
        </tr>
    `;

    resultsData.forEach(data => {
        const tr = document.createElement('tr');
        if (data.isDanger) {
            tr.classList.add('danger-row'); // 危険な行にクラスを付与
        }
        
        tr.innerHTML = `
            <td>${data.month}</td>
            <td>${data.payment.toFixed(0)}円</td>
            <td>${data.interest.toFixed(0)}円</td>
            <td>${data.principal.toFixed(0)}円</td>
            <td>${data.additional.toFixed(0)}円</td>
            <td>${data.balance.toFixed(0)}円</td>
        `;
        tbody.appendChild(tr);
    });
    
    table.appendChild(thead);
    table.appendChild(tbody);
}


// --- グラフ描画 (p5.js) ---
const sketch = (p) => {
    let padding = 50;

    p.setup = () => {
        let canvas = p.createCanvas(700, 400);
        canvas.parent('graph-holder');
        p.noLoop();
    };

    p.draw = () => {
        if (resultsData.length === 0) return;

        p.background(255);

        // 1. データの最大値・最小値を取得
        const maxMonths = resultsData[resultsData.length - 1].month;
        const maxAmount = Math.max(totalDebt, ...resultsData.map(d => d.balance));
        const minAmount = 0;
        const displayMaxAmount = maxAmount * 1.05;

        // 2. 座標変換関数
        const monthToX = (month) => p.map(month, 0, maxMonths, padding, p.width - padding);
        const amountToY = (amount) => p.map(amount, minAmount, displayMaxAmount, p.height - padding, padding);

        // 3. 軸と目盛りを描画
        drawAxes(p, monthToX, amountToY, 0, maxMonths, minAmount, displayMaxAmount);

        // 4. 借入残高グラフ (青)
        drawGraphLine(p, resultsData, 'balance', [30, 136, 229], 2);
    };
    
    // グラフの線を描画するヘルパー関数
    function drawGraphLine(p, data, key, color, weight) {
        const maxMonths = data[data.length - 1].month;
        const maxAmount = Math.max(totalDebt, ...data.map(d => d[key]));
        const minAmount = 0;
        const displayMaxAmount = maxAmount * 1.05;

        const xFunc = (val) => p.map(val, 0, maxMonths, padding, p.width - padding);
        const yFunc = (val) => p.map(val, minAmount, displayMaxAmount, p.height - padding, padding);

        p.noFill();
        p.stroke(color);
        p.strokeWeight(weight);
        p.beginShape();
        // 0ヶ月目の元金
        p.vertex(xFunc(0), yFunc(totalDebt));
        data.forEach(d => {
            p.vertex(xFunc(d.month), yFunc(d[key]));
        });
        p.endShape();
    }

    // 軸と目盛りを描画するヘルパー関数
    function drawAxes(p, xFunc, yFunc, minX, maxX, minY, maxY) {
        p.stroke(150);
        p.strokeWeight(1);
        
        p.line(padding, p.height - padding, p.width - padding, p.height - padding);
        p.line(padding, p.height - padding, padding, padding);

        p.fill(0);
        p.noStroke();
        
        p.textAlign(p.CENTER, p.TOP);
        p.text("経過月", p.width / 2, p.height - padding + 15);
        let xStep = Math.max(1, Math.ceil(maxX / 10)); 
        for (let x = minX; x <= maxX; x += xStep) {
            p.text(x, xFunc(x), p.height - padding + 5);
            p.stroke(230);
            p.line(xFunc(x), padding, xFunc(x), p.height - padding);
        }

        p.textAlign(p.RIGHT, p.CENTER);
        p.text("借入残高 (円)", padding - 15, p.height / 2);
        let yStep = (maxY - minY) / 5; 
        for (let y = minY; y <= maxY; y += yStep) {
            if (y < minY) continue; 
            p.text(y.toFixed(0), padding - 5, yFunc(y));
            p.stroke(230);
            p.line(padding, yFunc(y), p.width - padding, yFunc(y));
        }
    }
};