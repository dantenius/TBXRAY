import React, { useEffect, useState } from "react";

export default function TBXRayDetector() {
  const API_BASE = "https://tbxray-98b0a866420e.herokuapp.com/";
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [modelConnection, setModelConnection] = useState({
    status: "checking",
    message: "Checking connection...",
  });

  const pingBackend = async () => {
    setPinging(true);
    setModelConnection({
      status: "checking",
      message: "Checking connection...",
    });

    try {
      const response = await fetch(`${API_BASE}/ping`);
      if (!response.ok) throw new Error("Ping failed");
      const data = await response.json();
      setModelConnection({
        status: "connected",
        message: `Connected (${data.model_count || 0} models)`,
      });
    } catch (error) {
      setModelConnection({
        status: "disconnected",
        message: "Disconnected",
      });
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    pingBackend();
  }, [API_BASE]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const predictTB = async () => {
    if (!image) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
      setResult({
        error: "Failed to connect to backend. Check Flask connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadImageFromUrl = async () => {
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) return;

    setUrlLoading(true);
    setUrlError("");

    try {
      const response = await fetch(trimmedUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("URL does not point to an image");
      }

      const extension = blob.type.split("/")[1] || "jpg";
      const file = new File([blob], `xray-${Date.now()}.${extension}`, {
        type: blob.type,
      });

      setImage(file);
      setPreview(URL.createObjectURL(blob));
      setResult(null);
    } catch (error) {
      setUrlError("Failed to load image. Check the URL or CORS settings.");
    } finally {
      setUrlLoading(false);
    }
  };

  // Helper colors
  const getStatusColor = (label) => {
    if (!label) return "#9ca3af";
    if (label.includes("CONFIRMED: Normal")) return "#10b981";
    if (label.includes("CONFIRMED: Tuberculosis")) return "#ef4444";
    return "#f59e0b";
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === "High") return "#10b981";
    if (confidence === "Medium") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="app-header reveal" style={{ animationDelay: "40ms" }}>
          <h1 className="title">TB X-Ray Detector</h1>
          <p className="subtitle">
            Futuristic screening console for rapid TB risk triage.
          </p>
        </header>

        <div className="grid">
          {/* Upload Section */}
          <div className="panel column reveal" style={{ animationDelay: "120ms" }}>
            <div className="control-card">
              <div>
                <p className="control-label">Tri Model Consensus</p>
                <p className="control-subtext">
                  Analysis runs Model 1 + Model 2 + Model 3 and merges the verdict.
                </p>
              </div>
            </div>

            <div className="connection-status">
              <span className="connection-label">Model Connection</span>
              <div className="connection-actions">
                <span
                  className={`connection-pill ${modelConnection.status}`}
                  aria-live="polite"
                >
                  {modelConnection.message}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={pingBackend}
                  disabled={pinging}
                >
                  {pinging ? "Retrying..." : "Retry"}
                </button>
              </div>
            </div>

            <label className="upload-zone" htmlFor="fileInput">
              <div className="upload-icon">📤</div>
              <p className="upload-text">
                <strong>Click to upload</strong> X-Ray
              </p>
              <p className="upload-subtext">PNG, JPG (MAX. 10MB)</p>
            </label>
            <input
              type="file"
              id="fileInput"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-input"
            />

            <div className="upload-divider">
              <span>OR</span>
            </div>

            <div className="url-input">
              <input
                type="url"
                placeholder="Paste image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="url-field"
              />
              <button
                type="button"
                className="url-button"
                onClick={loadImageFromUrl}
                disabled={urlLoading}
              >
                {urlLoading ? "Loading..." : "Load"}
              </button>
            </div>
            {urlError && <p className="url-error">{urlError}</p>}

            {preview && (
              <div className="preview-block">
                <img src={preview} alt="Preview" className="preview-img" />
                <button
                  onClick={predictTB}
                  disabled={loading}
                  className={`btn-primary ${loading ? "disabled" : ""}`}
                >
                  {loading ? "Analyzing..." : "Analyze X-Ray"}
                </button>
              </div>
            )}
          </div>

          {/* Result Section */}
          <div className="panel reveal" style={{ animationDelay: "200ms" }}>
            {!result ? (
              <div className="empty-state">
                <div className="empty-icon">⚕️</div>
                <p className="empty-text">Upload an image to view analysis</p>
              </div>
            ) : result.error ? (
              <div className="error-box">
                <div className="error-icon">❌</div>
                <p className="error-text">{result.error}</p>
              </div>
            ) : (
              <div className="result-content">
                {/* Main Label */}
                <div className="main-label">
                  <div className="result-emoji">
                    {result.label.includes("CONFIRMED: Normal")
                      ? "✅"
                      : result.label.includes("CONFIRMED: Tuberculosis")
                      ? "🚨"
                      : "⚠️"}
                  </div>
                  <h2
                    className="result-title"
                    style={{ color: getStatusColor(result.label) }}
                  >
                    {result.label}
                  </h2>
                </div>

                {/* Statistics */}
                <div className="stats-box">
                  <div className="stat-row stat-row-border">
                    <span className="stat-label">System Verdict</span>
                    <span className="stat-value">
                      {result.status || "Unknown"}
                    </span>
                  </div>
                  <div className="stat-row stat-row-border">
                    <span className="stat-label">Overall Confidence</span>
                    <span className="stat-value">{result.confidence}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Consensus Rule</span>
                    <span
                      className="confidence-badge"
                      style={{
                        color: getConfidenceColor(result.confidence),
                        borderColor: getConfidenceColor(result.confidence),
                      }}
                    >
                      Match = Confirmed, Otherwise = Uncertain
                    </span>
                  </div>
                </div>

                {/* Warning Box */}
                {result.warning && (
                  <div className="warning-box">
                    <p className="warning-text">
                      <span style={{ marginRight: "8px", fontSize: "1.2rem" }}>
                        ⚠️
                      </span>
                      {result.warning}
                    </p>
                  </div>
                )}

                {/* Model Details */}
                {Array.isArray(result.models) && (
                  <div className="model-details">
                    {result.models.map((model) => (
                      <div className="model-card" key={model.id}>
                        <div className="model-header">
                          <div>
                            <p className="model-title">{model.label}</p>
                            <p className="model-subtitle">{model.detail}</p>
                          </div>
                          <span className="model-decision">
                            {model.decision}
                          </span>
                        </div>
                        <div className="model-metrics">
                          <div>
                            <p className="metric-label">Score</p>
                            <p className="metric-value mono">
                              {model.score.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="metric-label">Confidence</p>
                            <p className="metric-value">{model.confidence}</p>
                          </div>
                        </div>
                        {model.warning && (
                          <p className="model-warning">{model.warning}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Legend / Info */}
                <div className="info-box">
                  <p className="info-title">
                    📊 Interpretation Logic (Model 2)
                  </p>
                  <ul className="info-list">
                    <li>
                      Score &lt; 0.11 : <b>Normal</b> (High Confidence)
                    </li>
                    <li>
                      0.11 - 0.26 : <b>Borderline Normal</b> (Manual Check
                      Recommended)
                    </li>
                    <li>
                      0.26 - 0.35 : <b>Borderline TB</b> (Manual Check Required)
                    </li>
                    <li>
                      Score &ge; 0.35 : <b>Tuberculosis</b> (High Risk)
                    </li>
                  </ul>
                </div>

                <div className="info-box">
                  <p className="info-title">
                    📊 Interpretation Logic (Model 1 & 3)
                  </p>
                  <ul className="info-list">
                    <li>
                      Score &lt; 0.35 : <b>Normal</b> (High Confidence)
                    </li>
                    <li>
                      0.35 - 0.50 : <b>Borderline Normal</b> (Manual Check
                      Recommended)
                    </li>
                    <li>
                      0.50 - 0.65 : <b>Borderline TB</b> (Manual Check Required)
                    </li>
                    <li>
                      Score &ge; 0.65 : <b>Tuberculosis</b> (High Risk)
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="disclaimer reveal" style={{ animationDelay: "280ms" }}>
          <p className="disclaimer-text">
            ⚠️ Medical Disclaimer: This AI tool is for research/educational
            purposes only. Results must be verified by a qualified Radiologist.
          </p>
        </div>
      </div>
    </div>
  );
}
