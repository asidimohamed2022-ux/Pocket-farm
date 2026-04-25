// --- MANUALLY FIXED MAIN.JS ---

const root = document.getElementById('root');

// This replaces the React launcher with a simple startup screen
if (root) {
  root.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #2c3e50; color: white; font-family: sans-serif; text-align: center;">
      <h1 style="margin-bottom: 10px;">🚜 Pocket Farm</h1>
      <p style="margin-bottom: 20px;">The game is ready to build!</p>
      <button onclick="watchAd()" style="background: #27ae60; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 18px; cursor: pointer;">
        📺 Watch Ad for Reward
      </button>
      <p style="margin-top: 20px; font-size: 12px; color: #bdc3c7;">Running on GitHub Pages</p>
    </div>
  `;
}

console.log("Pocket Farm manual script loaded successfully!");
