// ==========================================
// 🛡️ PHISHGUARD AI - FRONTEND SCRIPT
// ==========================================

// Check URL
async function checkURL() {

    const urlInput = document.getElementById("urlInput");
    const resultBox = document.getElementById("result");

    const url = urlInput.value.trim();

    if (!url) {
        alert("Please enter a URL");
        return;
    }

    resultBox.innerHTML = "🔍 AI is Scanning...";

    try {

        const response = await fetch("/check-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: url
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        console.log("Check URL Result:", data);

        const result =
            data.result ||
            data.prediction ||
            data.label ||
            "Unknown";

        const riskScore =
            data.risk_score ??
            data.confidence ??
            data.score ??
            0;

        resultBox.innerHTML = `
            <div class="result-box">
                <h3>🔎 ${result}</h3>
                <p>Risk Score: <strong>${riskScore}%</strong></p>
            </div>
        `;

        // Refresh dashboard
        updateStatistics();
        displayHistory();

    } catch (error) {

        console.error("Check URL Error:", error);

        resultBox.innerHTML = `
            <div class="error-box">
                ❌ Cannot connect to PhishGuard AI backend.
                <br><br>
                Please try again.
            </div>
        `;
    }
}


// ==========================================
// 📊 UPDATE STATISTICS
// ==========================================

async function updateStatistics() {

    try {

        const response = await fetch("/statistics");

        if (!response.ok) {
            throw new Error("Statistics error");
        }

        const data = await response.json();

        console.log("Statistics:", data);

        const total =
            document.getElementById("totalChecks");

        const safe =
            document.getElementById("safeUrls");

        const suspicious =
            document.getElementById("suspiciousUrls");

        const phishing =
            document.getElementById("phishingUrls");


        if (total) {
            total.textContent =
                data.total ??
                data.total_checks ??
                0;
        }

        if (safe) {
            safe.textContent =
                data.safe ??
                data.safe_urls ??
                0;
        }

        if (suspicious) {
            suspicious.textContent =
                data.suspicious ??
                data.suspicious_urls ??
                0;
        }

        if (phishing) {
            phishing.textContent =
                data.phishing ??
                data.phishing_urls ??
                0;
        }

    } catch (error) {

        console.error(
            "Statistics Error:",
            error
        );
    }
}


// ==========================================
// 📜 DISPLAY HISTORY
// ==========================================

async function displayHistory() {

    try {

        const response = await fetch("/history");

        if (!response.ok) {
            throw new Error("History error");
        }

        const data = await response.json();

        console.log("History:", data);

        // Find history container
        const historyContainer =
            document.getElementById("history");

        if (!historyContainer) {
            return;
        }

        const historyList =
            Array.isArray(data)
                ? data
                : (
                    data.history ||
                    data.records ||
                    []
                );

        if (historyList.length === 0) {

            historyContainer.innerHTML =
                "<p>No URL history yet.</p>";

            return;
        }

        historyContainer.innerHTML =
            historyList.map(item => {

                const url =
                    item.url ||
                    "Unknown URL";

                const result =
                    item.result ||
                    item.prediction ||
                    item.label ||
                    "Unknown";

                const risk =
                    item.risk_score ??
                    item.confidence ??
                    item.score ??
                    0;

                return `
                    <div class="history-item">

                        <p>
                            <strong>🌐 ${url}</strong>
                        </p>

                        <p>
                            Result:
                            <strong>${result}</strong>
                        </p>

                        <p>
                            Risk:
                            <strong>${risk}%</strong>
                        </p>

                    </div>
                `;

            }).join("");

    } catch (error) {

        console.error(
            "History Error:",
            error
        );
    }
}


// ==========================================
// 🗑️ CLEAR HISTORY
// ==========================================

async function clearHistory() {

    try {

        const response =
            await fetch("/clear-history", {
                method: "DELETE"
            });

        if (!response.ok) {
            throw new Error(
                "Clear history error"
            );
        }

        alert("✅ History cleared!");

        updateStatistics();
        displayHistory();

    } catch (error) {

        console.error(
            "Clear History Error:",
            error
        );

        alert(
            "❌ Unable to clear history"
        );
    }
}


// ==========================================
// 🌙 DARK MODE
// ==========================================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );

    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );

    localStorage.setItem(
        "darkMode",
        isDark ? "true" : "false"
    );
}


// ==========================================
// 📷 QR SCANNER
// ==========================================

function openQRScanner() {

    const scanner =
        document.getElementById(
            "qrScanner"
        );

    if (scanner) {
        scanner.style.display = "block";
    }
}


// ==========================================
// ❌ CLOSE QR SCANNER
// ==========================================

function closeQRScanner() {

    const scanner =
        document.getElementById(
            "qrScanner"
        );

    if (scanner) {
        scanner.style.display = "none";
    }
}


// ==========================================
// 🚀 PAGE LOAD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // Load dark mode
        const darkMode =
            localStorage.getItem(
                "darkMode"
            );

        if (darkMode === "true") {

            document.body.classList.add(
                "dark-mode"
            );
        }

        // Load statistics
        updateStatistics();

        // Load history
        displayHistory();

    }
);
