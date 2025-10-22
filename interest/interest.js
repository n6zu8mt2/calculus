// --- グローバル変数 ---
let p5sketch;
let resultsData = []; // { year, simpleTotal, compoundTotal, compoundInterest }
let initialAmount = 0;
let interestType = 'simple';

// --- DOM読み込み完了時の処理 ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('calculateButton').addEventListener('click', runSimulation);
    p5sketch = new p5(sketch);
});

// --- シミュレーション実行 ---
function runSimulation() {
    // 1. UIから値を取得
    initialAmount = parseFloat(document.getElementById('initialAmount').value) || 100;
    const annualRateR = (parseFloat(document.getElementById('annualRate').value) || 1) / 100; // 0.01 形式
    const ratePercent = parseFloat(document.getElementById('annualRate').value) || 1; // 1 形式
    const years = parseInt(document.getElementById('years').value) || 20;
    interestType = document.querySelector('input[name="interestType"]:checked').value;
    const n = parseInt(document.getElementById('compoundingFrequency').value) || 1;

    // 2. 計算ロジック
    resultsData = []; // 結果配列をリセット
    let simpleTotal = initialAmount;
    let compoundTotal = initialAmount;
    resultsData.push({ 
        year: 0, 
        simpleTotal: initialAmount,
        compoundTotal: initialAmount,
        simpleInterest: 0,
        compoundInterest: 0
    });

    for (let y = 1; y <= years; y++) {
        // 単利は常に計算
        const simpleInterest = initialAmount * annualRateR;
        simpleTotal += simpleInterest;

        // 複利も常に計算（比較のため）
        const previousCompoundTotal = compoundTotal;
        const periodRate = annualRateR / n;
        compoundTotal = previousCompoundTotal * Math.pow(1 + periodRate, n);
        const compoundInterest = compoundTotal - previousCompoundTotal;

        resultsData.push({ 
            year: y, 
            simpleTotal: simpleTotal,
            compoundTotal: compoundTotal,
            simpleInterest: simpleInterest,
            compoundInterest: compoundInterest
        });
    }

    // 3. 結果の表示
    renderTable();
    p5sketch.redraw(); 
    
    // ▼▼▼ 2つの関数を呼び出し ▼▼▼
    renderContinuousCompounding(initialAmount, annualRateR);
    renderRule72(ratePercent);
    
    document.getElementById('results').classList.remove('hidden');
    // ▼▼▼ 2つのセクションを表示 ▼▼▼
    document.getElementById('continuous-calc').classList.remove('hidden');
    document.getElementById('rule-72-calc').classList.remove('hidden');
}

// --- 表の描画 ---
function renderTable() {
    // (変更なし)
    const table = document.getElementById('results-table');
    table.innerHTML = ''; 
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    if (interestType === 'simple') {
        thead.innerHTML = `
            <tr>
                <th>年</th>
                <th>発生した利息 (万円)</th>
                <th>貯金残高 (万円)</th>
            </tr>
        `;
        resultsData.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.year}</td>
                <td>${data.simpleInterest.toFixed(4)}</td>
                <td>${data.simpleTotal.toFixed(4)}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        thead.innerHTML = `
            <tr>
                <th>年</th>
                <th>単利 (合計)</th>
                <th>複利 (発生利息)</th>
                <th>複利 (合計)</th>
            </tr>
        `;
        resultsData.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${data.year}</td>
                <td>${data.simpleTotal.toFixed(4)}</td>
                <td>${data.compoundInterest.toFixed(4)}</td>
                <td>${data.compoundTotal.toFixed(4)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    table.appendChild(thead);
    table.appendChild(tbody);
}

// --- ▼▼▼ 2つの関数に分割 ▼▼▼ ---

// --- 追加機能 1: 連続複利とe ---
function renderContinuousCompounding(A0, r) {
    const eList = document.getElementById('e-limit-list');
    const n1 = A0 * Math.pow(1 + r/1, 1);
    const n12 = A0 * Math.pow(1 + r/12, 12);
    const n365 = A0 * Math.pow(1 + r/365, 365);
    const nLimit = A0 * Math.exp(r); // A0 * e^r

    eList.innerHTML = `
        <li><strong>年に 1回 (n=1)</strong>: ${n1.toFixed(6)} 万円</li>
        <li><strong>年に 12回 (n=12)</strong>: ${n12.toFixed(6)} 万円</li>
        <li><strong>年に 365回 (n=365)</strong>: ${n365.toFixed(6)} 万円</li>
        <li class="limit"><strong>連続 (n→∞) \\(A_0 e^r\\)</strong>: ${nLimit.toFixed(6)} 万円</li>
    `;
    
    // MathJaxに新しいコンテンツをレンダリングするよう指示
    if (window.MathJax) {
        setTimeout(() => {
            if (window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([eList]);
            }
        }, 0);
    }
}

// --- 追加機能 2: 72の法則 ---
function renderRule72(ratePercent) {
    const rule72 = 72 / ratePercent;
    const rule70 = 70 / ratePercent;
    
    let rule72Text = `<p>シミュレーターで設定した <b>年利 ${ratePercent}%</b> の場合、元金が2倍になるのは...<br>
    ・72の法則 (\\( 72 / r \\)): 約 <b>${rule72.toFixed(2)}</b> 年<br>
    ・70の法則 (\\( 70 / r \\)): 約 <b>${rule70.toFixed(2)}</b> 年</p>`;

    rule72Text += `<h4>具体例</h4>
    <ul>
        <li>年利<b>1%</b>の複利で<b>70</b>年間預けると、\\( (1 + 0.01)^{70} \\approx 2.0067 \\) となり約<b>2倍</b>になります。</li>
        <li>年利<b>2%</b>の複利で<b>35</b>年間預けると、\\( (1 + 0.02)^{35} \\approx 1.9998 \\) となり約<b>2倍</b>になります。</li>
        <li>年利<b>5%</b>の複利で<b>14</b>年間預けると、\\( (1 + 0.05)^{14} \\approx 1.9799 \\) となり約<b>2倍</b>になります。</li>
    </ul>`;
    
    rule72Text += `<h4>法則の導出（補足）</h4>
    <p>なぜ \\( \\frac{70}{r} \\) 年で約2倍になるのかは、以下のように説明できます。
    元金を $A$、年利を $r$（%）とすると、\\( \\frac{70}{r} \\) 年後の貯金残高は
    $$
    A \\left(1 + \\frac{r}{100} \\right)^{\\frac{70}{r}}
    = A \\left( \\left(1 + \\frac{r}{100} \\right)^{\\frac{100}{r}} \\right)^{\\frac{70}{100}}
    $$
    ここで、\\( x = \\frac{r}{100} \\) とおくと、 $r$ が小さいとき \\( (1+x)^{\\frac{1}{x}} \\approx e \\) （自然対数の底）と近似できます。
    よって、上の式は
    $$
    \\approx A \\times e^{\\frac{70}{100}} = A \\times e^{0.7} \\approx A \\times 2.01375
    $$
    となり、約 $2.01$ 倍になることがわかります。
    （一般に70より約数の多い72が使われることが多いです）
    </p>`;
    
    const rule72content = document.getElementById('rule-72-content');
    rule72content.innerHTML = rule72Text;
    
    // MathJaxに新しいコンテンツをレンダリングするよう指示
    if (window.MathJax) {
        setTimeout(() => {
            if (window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([rule72content]);
            }
        }, 0);
    }
}

// --- グラフ描画 (p5.js) ---
const sketch = (p) => {
    // (変更なし)
    let padding = 50;

    p.setup = () => {
        let canvas = p.createCanvas(700, 400);
        canvas.parent('graph-holder');
        p.noLoop(); 
    };

    p.draw = () => {
        if (resultsData.length === 0) return;

        p.background(255);

        const maxYears = resultsData[resultsData.length - 1].year;
        const maxSimple = resultsData[resultsData.length - 1].simpleTotal;
        const maxCompound = resultsData[resultsData.length - 1].compoundTotal;
        const maxAmount = Math.max(maxSimple, maxCompound);
        
        const minAmount = initialAmount * 0.95; 
        const displayMaxAmount = maxAmount * 1.05; 

        const yearToX = (year) => p.map(year, 0, maxYears, padding, p.width - padding);
        const amountToY = (amount) => p.map(amount, minAmount, displayMaxAmount, p.height - padding, padding);

        drawAxes(p, yearToX, amountToY, 0, maxYears, minAmount, displayMaxAmount);

        if (interestType === 'simple') {
            drawGraphLine(p, resultsData, 'simpleTotal', [30, 136, 229], 2);
        } else {
            drawGraphLine(p, resultsData, 'simpleTotal', [150, 150, 150], 2);
            drawGraphLine(p, resultsData, 'compoundTotal', [30, 136, 229], 2);
            
            p.noStroke();
            p.fill(150); p.rect(p.width - 150, padding + 10, 15, 15);
            p.fill(0); p.textAlign(p.LEFT, p.CENTER);
            p.text("単利", p.width - 130, padding + 17);
            
            p.fill(30, 136, 229); p.rect(p.width - 150, padding + 30, 15, 15);
            p.fill(0); p.textAlign(p.LEFT, p.CENTER);
            p.text("複利", p.width - 130, padding + 37);
        }
    };
    
    function drawGraphLine(p, data, key, color, weight) {
        const yearToX = (year) => p.map(year, 0, data[data.length - 1].year, padding, p.width - padding);
        const amountToY = (amount) => p.map(amount, initialAmount * 0.95, Math.max(data[data.length - 1].simpleTotal, data[data.length - 1].compoundTotal) * 1.05, p.height - padding, padding);

        p.noFill();
        p.stroke(color);
        p.strokeWeight(weight);
        p.beginShape();
        data.forEach(d => {
            p.vertex(yearToX(d.year), amountToY(d[key]));
        });
        p.endShape();
    }

    function drawAxes(p, xFunc, yFunc, minX, maxX, minY, maxY) {
        p.stroke(150); p.strokeWeight(1);
        
        p.line(padding, p.height - padding, p.width - padding, p.height - padding);
        p.line(padding, p.height - padding, padding, padding);

        p.fill(0); p.noStroke();
        
        p.textAlign(p.CENTER, p.TOP);
        p.text("年", p.width / 2, p.height - padding + 15);
        let xStep = Math.max(1, Math.ceil(maxX / 10)); 
        for (let x = minX; x <= maxX; x += xStep) {
            if (x === 0) {
                 p.text(0, xFunc(x) + 3, p.height - padding + 5);
            } else {
                 p.text(x, xFunc(x), p.height - padding + 5);
            }
            p.stroke(230);
            p.line(xFunc(x), padding, xFunc(x), p.height - padding);
        }

        p.textAlign(p.RIGHT, p.CENTER);
        p.text("金額 (万円)", padding - 15, p.height / 2);
        let yStep = (maxY - minY) / 5; 
        for (let y = minY; y <= maxY; y += yStep) {
            if (y < minY + yStep*0.1) continue; 
            p.text(y.toFixed(0), padding - 5, yFunc(y));
            p.stroke(230);
            p.line(padding, yFunc(y), p.width - padding, yFunc(y));
        }
    }
};