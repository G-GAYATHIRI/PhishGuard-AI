const API_BASE = "";

async function checkURL() {
    const urlInput = document.getElementById("urlInput");
    const resultBox = document.getElementById("result");

    const url = urlInput.value.trim();

    if (!url) {
        alert("Please enter a URL");
        return;
    }

    resultBox.innerHTML = "🔍 Analyzing URL...";

    try {
        const response = await fetch("/check-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        resultBox.innerHTML = `
            <h3>${data.result || data.prediction || "Result"}</h3>
            <p>Risk Score: ${data.risk_score ?? data.confidence ?? 0}%</p>
        `;

        loadStatistics();
        loadHistory();

    } catch (error) {
        console.error(error);

        resultBox.innerHTML = `
            <div class="error-box">
                ❌ Cannot connect to PhishGuard AI backend.
                <br>
                Please try again.
            </div>
        `;
    }
}

async function loadStatistics() {
    try {
        const response = await fetch("/statistics");

        if (!response.ok) {
            throw new Error("Statistics error");
        }

        const data = await response.json();

        const total = document.getElementById("totalChecks");
        const safe = document.getElementById("safeUrls");
        const suspicious = document.getElementById("suspiciousUrls");
        const phishing = document.getElementById("phishingUrls");

        if (total) total.textContent = data.total ?? data.total_checks ?? 0;
        if (safe) safe.textContent = data.safe ?? data.safe_urls ?? 0;
        if (suspicious) suspicious.textContent =
            data.suspicious ?? data.suspicious_urls ?? 0;
        if (phishing) phishing.textContent =
            data.phishing ?? data.phishing_urls ?? 0;

    } catch (error) {
        console.error("Statistics error:", error);
    }
}

async function loadHistory() {
    try {
        const response = await fetch("/history");

        if (!response.ok) {
            throw new Error("History error");
        }

        const data = await response.json();

        console.log("History:", data);

    } catch (error) {
        console.error("History error:", error);
    }
}

async function clearHistory() {
    try {
        const response = await fetch("/clear-history", {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Clear history error");
        }

        await loadStatistics();
        await loadHistory();

    } catch (error) {
        console.error("Clear history error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadStatistics();
    loadHistory();

    const checkButton = document.getElementById("checkButton");

    if (checkButton) {
        checkButton.addEventListener("click", checkURL);
    }
});
