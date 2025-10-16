document.addEventListener('DOMContentLoaded', () => {
    // ボタン要素を取得
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const resumeButton = document.getElementById('resumeButton');

    // シミュレーションの状態を管理する変数
    let n = 0; // 分裂回数
    let time = 0; // 経過時間(分)
    let count = BigInt(1); // 栗まんじゅうの数
    let volume = 1.0e-4; // 総体積 (m^3)
    let currentScaleIndex = -1;
    
    // インターバルIDを管理する変数
    let simulationInterval = null;
    let rainInterval = null;

    // 比較対象のスケール
    const scales = [
        { volume: 1.24e9, name: "東京ドーム", image: "images/dome.png" },
        { volume: 2.75e13, name: "琵琶湖", image: "images/lake.png" },
        { volume: 1.08e21, name: "地球", image: "images/earth.png" },
        { volume: 1.41e27, name: "太陽", image: "images/sun.png" },
        { volume: 3.3e45, name: "太陽系 (オールトの雲まで)", image: "images/solar_system.png" },
        { volume: 1e63, name: "天の川銀河", image: "images/galaxy.png" },
        { volume: 4e80, name: "観測可能な宇宙", image: "images/universe.png" }
    ];

    // シミュレーションを1ステップ進める関数
    const simulationStep = () => {
        n++;
        time += 5;
        count *= BigInt(2);
        volume *= 2;

        updateDisplay();

        if (n >= 282) { // 宇宙の体積を超える回数に達したら終了
            stopSimulation();
            showConclusion();
        }
    };

    // シミュレーションを開始する関数
    const startSimulation = () => {
        if (simulationInterval) return; // 既に動いていたら何もしない
        simulationInterval = setInterval(simulationStep, 100);
        
        // 雨を再開（必要なら）
        if (currentScaleIndex > -1) {
            startRain();
        }
    };
    
    // シミュレーションを停止する関数
    const stopSimulation = () => {
        clearInterval(simulationInterval);
        clearInterval(rainInterval);
        simulationInterval = null;
        rainInterval = null;
    };
    
    // 雨を開始/更新する関数
    const startRain = () => {
        if (rainInterval) clearInterval(rainInterval);
        const intervalTime = Math.max(10, 200 - currentScaleIndex * 30);
        rainInterval = setInterval(createKurimanju, intervalTime);
    };

    // スタートボタンの処理
    startButton.addEventListener('click', () => {
        startButton.classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');
        pauseButton.classList.remove('hidden');
        startSimulation();
    });

    // 一時停止ボタンの処理
    pauseButton.addEventListener('click', () => {
        stopSimulation();
        pauseButton.classList.add('hidden');
        resumeButton.classList.remove('hidden');
    });

    // 再開ボタンの処理
    resumeButton.addEventListener('click', () => {
        startSimulation();
        resumeButton.classList.add('hidden');
        pauseButton.classList.remove('hidden');
    });

    // --- 表示更新とユーティリティ関数 ---

    // 画面表示を更新する関数
    function updateDisplay() {
        document.getElementById('time').innerHTML = formatTime(time);
        
        const countElement = document.getElementById('count');
        if (count < BigInt(1000000)) {
             countElement.innerHTML = `${count.toLocaleString()} 個`;
        } else {
            const countStr = count.toString();
            const exponent = countStr.length - 1;
            const coefficient = (countStr[0] + '.' + countStr.substring(1, 3));
            countElement.innerHTML = `${count.toLocaleString()} 個 <br><small>(${coefficient} × 10<sup>${exponent}</sup> 個)</small>`;
        }
       
        document.getElementById('volume').innerHTML = `${formatExponential(volume)} m³`;

        if (currentScaleIndex + 1 < scales.length && volume >= scales[currentScaleIndex + 1].volume) {
            currentScaleIndex++;
            document.getElementById('scale-image').src = scales[currentScaleIndex].image;
            document.getElementById('scale-text').textContent = scales[currentScaleIndex].name + "を埋め尽くす！";
            startRain();
        }
    }

    // 指数表記を "A × 10^B" の形にフォーマット
    function formatExponential(num) {
        if (num === 0) return "0";
        const [coefficient, exponent] = num.toExponential(2).split('e');
        return `${coefficient} × 10<sup>${exponent.replace('+', '')}</sup>`;
    }
    
    // 時間を "〇時間△△分" の形にフォーマット
    function formatTime(minutes) {
        if (minutes < 60) {
            return `${minutes} 分`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours} 時間 ${remainingMinutes} 分`;
        }
    }

    // 栗まんじゅうを降らせる
    function createKurimanju() {
        const rainContainer = document.getElementById('kurimanju-rain');
        const manju = document.createElement('div');
        manju.classList.add('kurimanju');
        manju.style.left = Math.random() * 100 + 'vw';
        manju.style.animationDuration = Math.random() * 3 + 2 + 's';
        rainContainer.appendChild(manju);
        setTimeout(() => manju.remove(), 5000);
    }

    // 結論表示
    function showConclusion() {
        // ... (この関数の中身は変更なし)
        document.getElementById('conclusion').classList.remove('hidden');
        const finalN = 282;
        const finalTime = (finalN * 5) / 60;
        const finalCountStr = (BigInt(2) ** BigInt(finalN)).toString();
        const finalVolume = 1.0e-4 * (2 ** finalN);
        document.getElementById('final-time').textContent = finalTime.toFixed(1);
        document.getElementById('final-n').textContent = finalN;
        document.getElementById('final-n-exp').textContent = finalN;
        document.getElementById('final-count').innerHTML = formatExponentialConclusion(finalCountStr);
        const [coefficient, exponent] = finalVolume.toExponential(4).split('e');
        document.getElementById('final-volume').innerHTML = `${coefficient} × 10<sup>${exponent.replace('+', '')}</sup>`;
        setInterval(createKurimanju, 50);
    }
    
    // 結論用の指数表記フォーマット
    function formatExponentialConclusion(numStr) {
        const exponent = numStr.length - 1;
        const coefficient = parseFloat(numStr[0] + '.' + numStr.substring(1, 5));
        return `${coefficient} × 10<sup>${exponent}</sup>`;
    }
});