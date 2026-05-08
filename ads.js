// Function to initialize AdMob
function initAds() {
  const script = document.createElement('script');
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-app-pub-9911132333919550~6398162665";
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  console.log("AdMob script loaded.");
}

initAds();
