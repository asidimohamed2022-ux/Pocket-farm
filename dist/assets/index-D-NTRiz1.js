(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))n(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const r of t.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function c(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function n(e){if(e.ep)return;e.ep=!0;const t=c(e);fetch(e.href,t)}})();const i=document.getElementById("root");i&&(i.innerHTML=`
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #2c3e50; color: white; font-family: sans-serif; text-align: center;">
      <h1 style="margin-bottom: 10px;">🚜 Pocket Farm</h1>
      <p style="margin-bottom: 20px;">The game is ready to build!</p>
      <button onclick="watchAd()" style="background: #27ae60; color: white; border: none; padding: 15px 30px; border-radius: 8px; font-size: 18px; cursor: pointer;">
        📺 Watch Ad for Reward
      </button>
      <p style="margin-top: 20px; font-size: 12px; color: #bdc3c7;">Running on GitHub Pages</p>
    </div>
  `);console.log("Pocket Farm manual script loaded successfully!");
