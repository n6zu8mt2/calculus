document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const foldButton = document.getElementById('foldButton');
    const resetButton = document.getElementById('resetButton');
    const foldsSpan = document.getElementById('folds');
    const thicknessSpan = document.getElementById('thickness');
    const scaleImage = document.getElementById('scale-image');
    const scaleText = document.getElementById('scale-text');
    const conclusionSection = document.getElementById('conclusion');
    const finalFoldsSpan = document.getElementById('final-folds');
    const finalThicknessSpan = document.getElementById('final-thickness');
    const foldedPaperDiv = document.getElementById('folded-paper');

    // 定数
    const INITIAL_THICKNESS_M = 0.0001; // 0.1mmをメートルで
    const DISTANCE_TO_MOON_M = 3.8e8;

    // 比較対象のスケール (メートル単位)
    const scales = [
        { threshold: 0, name: "折り紙1枚ぶん", image: "images/paper.png" },
        { threshold: 634, name: "東京スカイツリーのてっぺん", image: "images/skytree.png" },
        { threshold: 8848, name: "エベレスト山の頂上", image: "images/everest.png" },
        { threshold: 50000, name: "成層圏", image: "images/stratosphere.png" },
        { threshold: DISTANCE_TO_MOON_M, name: "月", image: "images/moon.png" }
    ];

    // シミュレーションの状態
    let foldCount = 0;
    let thicknessMeters = INITIAL_THICKNESS_M;

    // イベントリスナーの設定
    foldButton.addEventListener('click', foldPaper);
    resetButton.addEventListener('click', resetSimulation);

    // 初期状態をセット
    updateDisplay();

    function foldPaper() {
        if (thicknessMeters >= DISTANCE_TO_MOON_M) return;

        foldCount++;
        thicknessMeters *= 2;
        updateDisplay();

        if (thicknessMeters >= DISTANCE_TO_MOON_M) {
            showConclusion();
        }
    }

    function resetSimulation() {
        foldCount = 0;
        thicknessMeters = INITIAL_THICKNESS_M;
        conclusionSection.classList.add('hidden');
        foldButton.disabled = false;
        updateDisplay();
    }

    function updateDisplay() {
        foldsSpan.textContent = foldCount;
        thicknessSpan.textContent = formatThickness(thicknessMeters);
        updateComparison();
        updatePaperVisual();
    }

    function updateComparison() {
        let currentScale = scales[0];
        for (let i = scales.length - 1; i >= 0; i--) {
            if (thicknessMeters >= scales[i].threshold) {
                currentScale = scales[i];
                break;
            }
        }
        scaleImage.src = currentScale.image;
        scaleText.textContent = currentScale.name + "を超えた！";
    }
    
    function updatePaperVisual() {
        // 視覚的な厚さを対数的に表現して、変化が分かりやすくする
        const visualHeight = Math.min(50, 1 + Math.log2(thicknessMeters / INITIAL_THICKNESS_M));
        foldedPaperDiv.style.height = `${visualHeight}px`;
    }

    function showConclusion() {
        conclusionSection.classList.remove('hidden');
        finalFoldsSpan.textContent = foldCount;
        finalThicknessSpan.textContent = formatThickness(thicknessMeters);
        foldButton.disabled = true;
    }

    function formatThickness(meters) {
        if (meters < 1) {
            return `${(meters * 1000).toFixed(1)} mm`;
        }
        if (meters < 1000) {
            return `${meters.toFixed(2)} m`;
        }
        return `${(meters / 1000).toLocaleString('ja-JP', { maximumFractionDigits: 0 })} km`;
    }
});