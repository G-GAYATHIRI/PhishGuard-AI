
/* ==========================================
   PHISHGUARD AI - FRONTEND SCRIPT
========================================== */

let securityChartInstance = null;

// ==========================================
// UPDATE STATISTICS + CHART
// ==========================================
async function updateStatistics() {
    try {
        const response = await fetch("/statistics", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Statistics request failed");
        }

        const stats = await response.json();

        const total = Number(stats.total ?? stats.total_checks ?? 0);
        const safe = Number(stats.safe ?? stats.safe_urls ?? 0);
        const suspicious = Number(
            stats.suspicious ?? stats.suspicious_urls ?? 0
        );
        const phishing = Number(
            stats.phishing ?? stats.phishing_urls ?? 0
        );

        // Dashboard statistics
        setText("totalChecks", total);
        setText("safeChecks", safe);
        setText("suspiciousChecks", suspicious);
        setText("phishingChecks", phishing);

        // Security Overview cards
        setText("safeOverviewCount", safe);
        setText("suspiciousOverviewCount", suspicious);
        setText("phishingOverviewCount", phishing);

        // Update chart using the same statistics
        updateSecurityChart(safe, suspicious, phishing);

        console.log("Statistics updated:", stats);
    } catch (error) {
        console.error("Statistics Error:", error);
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// ==========================================
// SECURITY CHART
// ==========================================
function updateSecurityChart(safe, suspicious, phishing) {
    const canvas = document.getElementById("securityChart");

    if (!canvas) {
        console.error("securityChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js did not load");
        return;
    }

    if (securityChartInstance) {
        securityChartInstance.data.datasets[0].data = [
            safe, suspicious, phishing
        ];
        securityChartInstance.update();
        return;
    }

    securityChartInstance = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Safe", "Suspicious", "Phishing"],
            datasets: [{
                data: [safe, suspicious, phishing],
                backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

// ==========================================
// CHECK URL
// ==========================================
async function checkURL() {
    const input = document.getElementById("urlInput");
    const resultBox = document.getElementById("result");

    if (!input || !resultBox) return;

    const url = input.value.trim();

    if (!url) {
        resultBox.innerHTML = `
            <div class="error-box">
                ⚠️ Please enter a website URL.
            </div>`;
        return;
    }

    resultBox.innerHTML = `
        <div class="scanning">🔍 AI is Scanning...</div>`;

    try {
        const response = await fetch("/check-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "URL check failed");
        }

        console.log("Check URL Result:", data);

        if (data.result === "Invalid URL") {
            resultBox.innerHTML = `
                <div class="result-card suspicious">
                    <h2>⚠️ Invalid URL</h2>
                    <p>${escapeHTML(
                        data.reasons?.[0] || "Please enter a valid URL."
                    )}</p>
                </div>`;
            return;
        }

        const riskLevel = data.risk_level || "Unknown";
        let resultClass = "low-risk";
        let icon = "🛡️";

        if (riskLevel === "Suspicious") {
            resultClass = "suspicious";
            icon = "⚠️";
        } else if (
            riskLevel === "High Risk" ||
            riskLevel.toLowerCase() === "phishing"
        ) {
            resultClass = "phishing";
            icon = "🚨";
        }

        const reasons = Array.isArray(data.reasons)
            ? data.reasons
            : [];

        const features = Array.isArray(data.features)
            ? data.features
            : [];

        const reasonsHTML = reasons.length
            ? reasons.map(reason =>
                `<li>${escapeHTML(reason)}</li>`
            ).join("")
            : "<li>No major suspicious features detected.</li>";

        const featuresHTML = features.length
            ? `<div class="features">
                   <h3>🔎 Detected Features</h3>
                   <ul>${features.map(feature =>
                       `<li>${escapeHTML(feature)}</li>`
                   ).join("")}</ul>
               </div>`
            : "";

        const score = Math.max(
            0,
            Math.min(100, Number(data.risk_score ?? 0))
        );

        resultBox.innerHTML = `
            <div class="result-card ${resultClass}">
                <div class="result-header">
                    <div>
                        <h2>${icon} ${escapeHTML(
                            data.result || "Analysis Complete"
                        )}</h2>
                        <p>${escapeHTML(data.url || url)}</p>
                    </div>
                </div>

                <div class="risk-score">
                    <h3>Risk Score</h3>
                    <div class="risk-number">${score}%</div>
                    <div class="risk-bar">
                        <div class="risk-fill"
                             style="width:${score}%"></div>
                    </div>
                    <p>${escapeHTML(riskLevel)}</p>
                </div>

                <div class="reasons">
                    <h3>🚩 Security Analysis</h3>
                    <ul>${reasonsHTML}</ul>
                </div>

                ${featuresHTML}
            </div>`;

        await Promise.all([
            updateStatistics(),
            displayHistory()
        ]);

    } catch (error) {
        console.error("Check URL Error:", error);
        resultBox.innerHTML = `
            <div class="error-box">
                ❌ Unable to complete the URL check.
                Please try again.
            </div>`;
    }
}

// ==========================================
// DISPLAY HISTORY
// ==========================================
async function displayHistory() {
    try {
        const response = await fetch("/history", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("History request failed");
        }

        const data = await response.json();
        const container = document.getElementById("historyList");

        if (!container) return;

        const items = Array.isArray(data)
            ? data
            : (data.history || data.records || []);

        if (!items.length) {
            container.innerHTML = `
                <div class="empty-history">No URL checks yet.</div>`;
            return;
        }

        container.innerHTML = items.map(item => {
            const url = item.url || "Unknown URL";
            const result = item.result ||
                item.prediction || item.label || "Unknown";
            const risk = item.risk_score ??
                item.confidence ?? item.score ?? 0;

            return `
                <div class="history-item">
                    <p><strong>🌐 ${escapeHTML(url)}</strong></p>
                    <p>Result: <strong>${escapeHTML(result)}</strong></p>
                    <p>Risk: <strong>${escapeHTML(risk)}%</strong></p>
                </div>`;
        }).join("");

    } catch (error) {
        console.error("History Error:", error);
    }
}

// ==========================================
// CLEAR HISTORY
// ==========================================
async function clearHistory() {
    if (!confirm("Are you sure you want to clear URL history?")) {
        return;
    }

    try {
        const response = await fetch("/clear-history", {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Clear history request failed");
        }

        await Promise.all([
            updateStatistics(),
            displayHistory()
        ]);

        alert("✅ History cleared!");

    } catch (error) {
        console.error("Clear History Error:", error);
        alert("❌ Unable to clear history. Please try again.");
    }
}

// ==========================================
// DARK MODE
// ==========================================
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", String(isDark));
}

// ==========================================
// SAFE TEXT DISPLAY
// ==========================================
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// ==========================================
// PAGE LOAD
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }

    const checkButton = document.getElementById("checkUrlButton");

    if (checkButton) {
        checkButton.addEventListener("click", checkURL);
    }

    await Promise.all([
        updateStatistics(),
        displayHistory()
    ]);
});
