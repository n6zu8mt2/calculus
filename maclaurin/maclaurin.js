// --- グローバル変数 ---
let p5sketch;
let currentFunctionKey = 'exp';
let centerA = 0;
let paramB = 1;
let orderN = 1;
const MAX_ORDER = 15; // 描画する最大次数

// DOM要素
let funcSelector, centerAInput, paramBInput, orderNSlider;
// ▼▼▼ formulaNspan を削除し、formulaTitleSpan を追加 ▼▼▼
let orderNValueSpan, formulaTitleSpan, polynomialFormulaDiv, detailsContentDiv;
// ▲▲▲ 変更ここまで ▲▲▲
let aWarning, bWarning;

// --- Helper Functions (変更なし) ---
// Greatest Common Divisor
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    if (b > a) { let temp = a; a = b; b = temp; }
    while (true) {
        if (b === 0) return a;
        a %= b;
        if (a === 0) return b;
        b %= a;
    }
}
// Convert decimal to fraction string (limited precision/denominator)
function toFraction(decimal, tolerance = 1.0E-9, maxDenominator = 100) {
    if (isNaN(decimal) || !isFinite(decimal)) return null;
    const sign = decimal < 0 ? -1 : 1;
    decimal = Math.abs(decimal);
    if (decimal % 1 < tolerance) return `${sign * decimal}/1`;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;
    do {
        let a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        if (Math.abs(b - a) < tolerance) break;
        b = 1 / (b - a);
    } while (k1 <= maxDenominator);
    if (k1 > maxDenominator) return null;
    if (Math.abs(decimal - h1 / k1) > tolerance * decimal) return null;
    return `${sign * h1}/${k1}`;
}


// --- Function Definitions (Corrected LaTeX) ---
const functionDefs = {
    'exp': {
        label: '$f(x) = e^{bx}$',
        func: (x, b) => Math.exp(b * x),
        deriv_k_at_a: (k, a, b) => Math.pow(b, k) * Math.exp(b * a),
        // ▼▼▼ Corrected LaTeX: \\sum, \\frac ▼▼▼
        details: `<h3>$f(x) = e^{bx}$ のテイラー展開</h3>
                  <h4>ケース: $b=1, a=0$ (マクローリン展開)</h4>
                  $$ e^x = \\sum_{k=0}^{\\infty} \\frac{1}{k!}x^k = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\dots $$
                  <h4>一般のケース ($x=a$ 中心)</h4>
                  $$ e^{bx} = e^{ba} \\sum_{k=0}^{\\infty} \\frac{b^k}{k!}(x-a)^k = e^{ba} \\left( 1 + b(x-a) + \\frac{b^2}{2!}(x-a)^2 + \\dots \\right) $$`
        // ▲▲▲ Corrected LaTeX ▲▲▲
    },
    'sin': {
        label: '$f(x) = \\sin(bx)$',
        func: (x, b) => Math.sin(b * x),
        deriv_k_at_a: (k, a, b) => {
            const power_b = Math.pow(b, k);
            switch (k % 4) {
                case 0: return power_b * Math.sin(b * a); // sin
                case 1: return power_b * Math.cos(b * a); // b cos
                case 2: return -power_b * Math.sin(b * a); // -b^2 sin
                case 3: return -power_b * Math.cos(b * a); // -b^3 cos
                default: return 0;
            }
        },
         // ▼▼▼ Corrected LaTeX: \\sum, \\frac ▼▼▼
        details: `<h3>$f(x) = \\sin(bx)$ のテイラー展開</h3>
                  <h4>ケース: $b=1, a=0$ (マクローリン展開)</h4>
                  $$ \\sin(x) = \\sum_{k=0}^{\\infty} \\frac{(-1)^k}{(2k+1)!}x^{2k+1} = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\dots $$
                  <h4>一般のケース ($x=a$ 中心)</h4>
                  <p>$f(x) = \\sin(bx)$ を $x=a$ を中心にテイラー展開するには、$f^{(k)}(a)$ の値を計算して代入します。</p>
                  $$ P_n(x) = \\sin(ba) + \\frac{b\\cos(ba)}{1!}(x-a) - \\frac{b^2\\sin(ba)}{2!}(x-a)^2 - \\frac{b^3\\cos(ba)}{3!}(x-a)^3 + \\dots $$`
        // ▲▲▲ Corrected LaTeX ▲▲▲
    },
    'cos': {
        label: '$f(x) = \\cos(bx)$',
        func: (x, b) => Math.cos(b * x),
        deriv_k_at_a: (k, a, b) => {
            const power_b = Math.pow(b, k);
            switch (k % 4) {
                case 0: return power_b * Math.cos(b * a);  // cos
                case 1: return -power_b * Math.sin(b * a); // -b sin
                case 2: return -power_b * Math.cos(b * a); // -b^2 cos
                case 3: return power_b * Math.sin(b * a);  // b^3 sin
                default: return 0;
            }
        },
         // ▼▼▼ Corrected LaTeX: \\sum, \\frac ▼▼▼
         details: `<h3>$f(x) = \\cos(bx)$ のテイラー展開</h3>
                  <h4>ケース: $b=1, a=0$ (マクローリン展開)</h4>
                  $$ \\cos(x) = \\sum_{k=0}^{\\infty} \\frac{(-1)^k}{(2k)!}x^{2k} = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\dots $$
                   <h4>一般のケース ($x=a$ 中心)</h4>
                  <p>$f(x) = \\cos(bx)$ を $x=a$ を中心にテイラー展開するには、$f^{(k)}(a)$ の値を計算して代入します。</p>
                 $$ P_n(x) = \\cos(ba) - \\frac{b\\sin(ba)}{1!}(x-a) - \\frac{b^2\\cos(ba)}{2!}(x-a)^2 + \\frac{b^3\\sin(ba)}{3!}(x-a)^3 + \\dots $$`
         // ▲▲▲ Corrected LaTeX ▲▲▲
    },
    'log': {
        label: '$f(x) = \\log(1+x)$',
        func: (x, b) => (x > -1) ? Math.log(1 + x) : NaN, // bは使わない
        deriv_k_at_a: (k, a, b) => {
             if (a !== 0) return NaN; // a=0のみサポート
             if (k === 0) return 0; // log(1)=0
             return Math.pow(-1, k - 1) * factorial(k - 1);
        },
         // ▼▼▼ Corrected LaTeX: \\sum, \\frac ▼▼▼
         details: `<h3>$f(x) = \\log(1+x)$ のマクローリン展開</h3>
                  <p>この関数は $x=0$ を中心とするマクローリン展開のみを考えます ($a=0$ 固定)。定義域は $x > -1$ です。</p>
                  <h4>展開式</h4>
                  $$ \\log(1+x) = \\sum_{k=1}^{\\infty} \\frac{(-1)^{k-1}}{k}x^k = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\frac{x^4}{4} + \\dots $$
                  <p>この展開は $|x| < 1$ で収束します。</p>`
         // ▲▲▲ Corrected LaTeX ▲▲▲
    }
};

// 階乗キャッシュ
const factorialCache = [1];
function factorial(n) {
    if (n < 0) return NaN;
    if (n >= factorialCache.length) {
        for (let i = factorialCache.length; i <= n; i++) {
            factorialCache[i] = factorialCache[i - 1] * i;
        }
    }
    return factorialCache[n];
}

// --- DOM読み込み完了時の処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素を取得
    funcSelector = document.getElementById('functionSelector');
    centerAInput = document.getElementById('centerA');
    paramBInput = document.getElementById('paramB');
    orderNSlider = document.getElementById('orderN');
    orderNValueSpan = document.getElementById('orderNValue');
    // ▼▼▼ formulaNspan を削除し、formulaTitleSpan を取得 ▼▼▼
    formulaTitleSpan = document.getElementById('formula-title');
    // ▲▲▲ 変更ここまで ▲▲▲
    polynomialFormulaDiv = document.getElementById('polynomial-formula');
    detailsContentDiv = document.getElementById('details-content');
    aWarning = document.getElementById('a-warning');
    bWarning = document.getElementById('b-warning');

    p5sketch = new p5(sketch);

    // イベントリスナーを設定
    funcSelector.addEventListener('change', handleInputChange);
    centerAInput.addEventListener('input', handleInputChange);
    paramBInput.addEventListener('input', handleInputChange);
    orderNSlider.addEventListener('input', handleInputChange);

    // 初期表示
    updateUI();
});

// --- UI入力ハンドラ (変更なし) ---
function handleInputChange() {
    currentFunctionKey = funcSelector.value;
    centerA = parseFloat(centerAInput.value) || 0;
    paramB = parseFloat(paramBInput.value) || 1;
    orderN = parseInt(orderNSlider.value);

    if (currentFunctionKey === 'log') {
        centerA = 0;
        centerAInput.value = 0;
        centerAInput.disabled = true;
        paramBInput.disabled = true;
        aWarning.classList.remove('hidden');
        bWarning.classList.remove('hidden');
    } else {
        centerAInput.disabled = false;
        paramBInput.disabled = false;
        aWarning.classList.add('hidden');
        bWarning.classList.add('hidden');
    }
    updateUI();
}

// --- UI表示更新 (修正版) ---
function updateUI() {
    // スライダーの値表示 (変更なし)
    orderNValueSpan.textContent = `n = ${orderN}`;

    // ▼▼▼ formulaTitleSpan の内容を更新 ▼▼▼
    formulaTitleSpan.innerHTML = `\\( P_{${orderN}}(x) \\ (n = ${orderN}) \\)`;
    // ▲▲▲ 変更ここまで ▲▲▲

    try {
        const polyTexFraction = generatePolynomialTex(currentFunctionKey, centerA, paramB, orderN, true);
        const polyTexDecimal = generatePolynomialTex(currentFunctionKey, centerA, paramB, orderN, false);
        // ▼▼▼ 改行を追加し、2つ目の P_n(x)= を削除 ▼▼▼
        polynomialFormulaDiv.innerHTML = `\\( ${polyTexFraction} \\) <br> \\( \\approx ${polyTexDecimal} \\)`;
        // ▲▲▲ 変更ここまで ▲▲▲
    } catch (e) {
        console.error("Error generating polynomial TeX:", e);
        polynomialFormulaDiv.innerHTML = "数式の生成中にエラーが発生しました。";
    }

    detailsContentDiv.innerHTML = functionDefs[currentFunctionKey].details;

    if (window.MathJax) {
        setTimeout(() => {
            try {
                if (window.MathJax.typesetPromise) {
                    // ▼▼▼ formulaTitleSpan もレンダリング対象に追加 ▼▼▼
                    window.MathJax.typesetPromise([formulaTitleSpan, polynomialFormulaDiv, detailsContentDiv])
                        .catch((err) => console.error('MathJax Typesetting failed:', err));
                } else if (window.MathJax.Hub) {
                     window.MathJax.Hub.Queue(
                         // ▼▼▼ formulaTitleSpan もレンダリング対象に追加 ▼▼▼
                         ["Typeset", window.MathJax.Hub, formulaTitleSpan],
                         ["Typeset", window.MathJax.Hub, polynomialFormulaDiv],
                         ["Typeset", window.MathJax.Hub, detailsContentDiv]
                     );
                }
            } catch (e) {
                console.error("Error queueing MathJax typesetting:", e);
            }
        }, 0);
    }

    if (p5sketch && typeof p5sketch.redraw === 'function') {
        p5sketch.redraw();
    } else {
        console.warn("p5 sketch not ready for redraw");
    }
}


// --- TeX形式の多項式文字列を生成 (修正：小数版では P_n(x)= を削除) ---
function generatePolynomialTex(key, a, b, n, useFraction) {
    // 小数版では P_n(x)= を出力しない
    let texString = useFraction ? `P_{${n}}(x) = ` : '';
    const def = functionDefs[key];
    let terms = [];
    const TOLERANCE = 1e-9;
    const MAX_FACTORIAL_FOR_FRACTION = 8;

    for (let k = 0; k <= n; k++) {
        const deriv_k = def.deriv_k_at_a(k, a, b);
        if (isNaN(deriv_k) || Math.abs(deriv_k) < TOLERANCE) continue;

        const fact_k = factorial(k);
        if (fact_k === 0 || isNaN(fact_k)) continue;

        let termTex = "";
        let sign = "";
        let abs_deriv_k = Math.abs(deriv_k);

        // 符号
        if (terms.length > 0) {
            sign = (deriv_k > 0) ? "+ " : "- ";
        } else if (deriv_k < 0) {
            sign = "- ";
        }
        termTex += sign;

        // 係数 f^(k)(a) / k!
        let coefficientStr = "";
        if (useFraction) {
            let derivStr = (Math.abs(abs_deriv_k - Math.round(abs_deriv_k)) < TOLERANCE)
                           ? Math.round(abs_deriv_k).toString()
                           : abs_deriv_k.toFixed(3);

             if (k <= 1 && Math.abs(abs_deriv_k - 1) < TOLERANCE) { // k=0,1 で |f^(k)|=1
                 if (k===0) coefficientStr = "1";
             }
             else if (k <= 1) { // k=0,1 で |f^(k)| != 1
                 coefficientStr = derivStr;
             }
             else { // k >= 2
                 if (Math.abs(abs_deriv_k - 1) < TOLERANCE) { // |f^(k)| = 1
                      coefficientStr = `\\frac{1}{${fact_k}}`;
                 } else { // |f^(k)| != 1
                      coefficientStr = `\\frac{${derivStr}}{${fact_k}}`;
                 }
             }

        } else {
            const coefficient = abs_deriv_k / fact_k;
             if (Math.abs(coefficient - 1) < TOLERANCE && k > 0) {
                // 係数1は省略
            } else {
                 coefficientStr = coefficient.toFixed(3);
                 if (coefficientStr.endsWith('.000')) {
                     coefficientStr = coefficientStr.slice(0, -4);
                 } else if (coefficientStr.endsWith('00')) {
                     coefficientStr = coefficientStr.slice(0, -2);
                 } else if (coefficientStr.endsWith('0')) {
                     coefficientStr = coefficientStr.slice(0, -1);
                 }
            }
        }

        termTex += coefficientStr;
        if (coefficientStr !== "" && k > 0) termTex += " ";

        // (x-a)^k の部分
        if (k > 0) {
            if (a === 0) {
                termTex += `x`;
                if (k > 1) termTex += `^{${k}}`;
            } else {
                let aStr = (Math.abs(a) % 1 === 0) ? Math.abs(a).toString() : Math.abs(a).toFixed(2);
                termTex += `(x ${a > 0 ? '-' : '+'} ${aStr})`;
                if (k > 1) termTex += `^{${k}}`;
            }
        } else if (coefficientStr === "") {
            termTex += "1";
        }

        terms.push(termTex.trim());
    }

    if (terms.length === 0) {
        return useFraction ? `P_{${n}}(x) = 0` : `0`;
    }

    texString += terms.join(" ");
    texString = texString.replace(/\+ -/g, '- ');
    texString = texString.replace(/^ /,'');

    return texString;
}

// --- グラフ描画 (p5.js) (変更なし) ---
const sketch = (p) => {
    let padding = 50;
    let xMin = -5, xMax = 5;
    let yMin = -5, yMax = 5;

    p.setup = () => {
        let canvas = p.createCanvas(700, 400);
        canvas.parent('graph-holder');
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noLoop();
    };

    p.draw = () => {
        if (!functionDefs[currentFunctionKey] || typeof centerA === 'undefined' || typeof paramB === 'undefined' || typeof orderN === 'undefined') {
             p.background(240); p.fill(100); p.textAlign(p.CENTER, p.CENTER);
             p.text("設定を読み込み中...", p.width/2, p.height/2);
             return;
        }

        p.background(255);

        if (currentFunctionKey === 'log') {
             xMin = -0.9; xMax = 5;
             yMin = -3; yMax = 3;
        } else if (currentFunctionKey === 'exp') {
             xMin = -5; xMax = 5;
             yMin = -2;
             yMax = 16;
        } else {
             xMin = -2 * Math.PI; xMax = 2 * Math.PI;
             yMin = -2; yMax = 2;
        }

        const toScreenX = (x) => p.map(x, xMin, xMax, padding, p.width - padding);
        const toScreenY = (y) => p.map(y, yMin, yMax, p.height - padding, padding);

        drawAxesAndGrid(p, toScreenX, toScreenY, xMin, xMax, yMin, yMax);

        const def = functionDefs[currentFunctionKey];
        const currentN = orderN;
        const currentA = centerA;
        const currentB = paramB;

        // 元の関数 f(x)
        p.noFill(); p.stroke(0); p.strokeWeight(2);
        p.beginShape();
        let lastYValidFunc = false;
        for (let x = xMin; x <= xMax; x += (xMax - xMin) / 300) {
            let y = NaN;
             try { y = def.func(x, currentB); } catch (e) {}
            if (isFinite(y) && y >= yMin && y <= yMax) {
                if (!lastYValidFunc && x !== xMin) p.beginShape();
                p.vertex(toScreenX(x), toScreenY(y));
                lastYValidFunc = true;
            } else {
                 if (lastYValidFunc) p.endShape();
                 lastYValidFunc = false;
            }
        }
        p.endShape();

        // テイラー多項式 P_k(x)
        for (let k = 0; k <= currentN; k++) {
            const hue = (k * 40) % 360;
            const weight = (k === currentN) ? 2.5 : 1;
            const alpha = (k === currentN) ? 100 : 70;

            p.stroke(hue, 90, 90, alpha);
            p.strokeWeight(weight);
            p.beginShape();
            let lastYValidPoly = false;

            for (let x = xMin; x <= xMax; x += (xMax - xMin) / 300) {
                let polyValue = 0;
                let calculationOk = true;
                try {
                    for (let j = 0; j <= k; j++) {
                        const deriv_j = def.deriv_k_at_a(j, currentA, currentB);
                        const fact_j = factorial(j);
                        if (isNaN(deriv_j) || !isFinite(deriv_j) || fact_j === 0 || isNaN(fact_j)) {
                            calculationOk = false; break;
                        }
                        const term = (deriv_j / fact_j) * Math.pow(x - currentA, j);
                         if (isNaN(term) || !isFinite(term)) {
                             calculationOk = false; break;
                         }
                        polyValue += term;
                    }
                } catch(e) { calculationOk = false; }

                if (calculationOk && isFinite(polyValue) && polyValue >= yMin && polyValue <= yMax) {
                     if (!lastYValidPoly && x !== xMin) p.beginShape();
                    p.vertex(toScreenX(x), toScreenY(polyValue));
                    lastYValidPoly = true;
                } else {
                     if (lastYValidPoly) p.endShape();
                     lastYValidPoly = false;
                }
            }
            p.endShape();
        }

        // 中心線 x=a
        if (currentA >= xMin && currentA <= xMax) {
            p.stroke(150, 100, 100, 50);
            p.strokeWeight(1);
            p.line(toScreenX(currentA), padding, toScreenX(currentA), p.height - padding);
        }
    };

    function drawAxesAndGrid(p, xFunc, yFunc, xMin, xMax, yMin, yMax) {
        const gridColor = 220;
        const axisColor = 0;
        const textColor = 0;

        p.strokeWeight(1);
        p.textSize(10);

        // X軸
        p.stroke(axisColor);
        const yZero = p.constrain(yFunc(0), padding, p.height - padding);
        p.line(padding, yZero, p.width - padding, yZero);

        p.fill(textColor);
        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);

        if (currentFunctionKey === 'sin' || currentFunctionKey === 'cos') {
            const pi_step = Math.PI / 2;
            for (let x = Math.ceil(xMin / pi_step) * pi_step; x <= xMax; x += pi_step) {
                const screenX = xFunc(x);
                p.stroke(gridColor);
                p.line(screenX, padding, screenX, p.height - padding);
                p.noStroke();
                p.fill(textColor);
                let label = "";
                const multiple = Math.round(x / pi_step);
                if (multiple === 0) label = "0";
                else if (multiple === 1) label = "π/2";
                else if (multiple === -1) label = "-π/2";
                else if (multiple === 2) label = "π";
                else if (multiple === -2) label = "-π";
                else if (multiple % 2 !== 0) label = `${multiple}π/2`;
                else label = `${multiple/2}π`;
                p.text(label, screenX, yZero + 5);
            }
        } else {
            const x_step = (xMax - xMin > 20) ? 2 : 1;
             for (let x = Math.ceil(xMin / x_step) * x_step; x <= xMax; x += x_step) {
                const screenX = xFunc(x);
                p.stroke(gridColor);
                p.line(screenX, padding, screenX, p.height - padding);
                p.noStroke();
                 p.fill(textColor);
                if (x === 0) {
                     p.text(0, screenX - 5, yZero + 5);
                } else {
                     p.text(x, screenX, yZero + 5);
                }
            }
        }
         p.textSize(12);
         p.text("x", p.width - padding + 10, yZero - 10);

        // Y軸
        p.stroke(axisColor);
        const xZero = p.constrain(xFunc(0), padding, p.width - padding);
        p.line(xZero, padding, xZero, p.height - padding);

        p.fill(textColor);
        p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.textSize(10);

        const y_step = (yMax - yMin > 10) ? 2 : (yMax - yMin > 5 ? 1 : 0.5);
        for (let y = Math.ceil(yMin / y_step) * y_step; y <= yMax; y += y_step) {
            if (Math.abs(y) < 1e-9) continue;
            const screenY = yFunc(y);
            p.stroke(gridColor);
            p.line(padding, screenY, p.width - padding, screenY);
            p.noStroke();
            p.fill(textColor);
            p.text(y.toFixed(y_step < 1 ? 1: 0), xZero - 5, screenY);
        }
        p.textSize(12);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text("y", xZero, padding - 5);
    }
};