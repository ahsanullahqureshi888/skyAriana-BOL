# -*- coding: utf-8 -*-
import sys, os, subprocess, time, webbrowser

def launch_app():
    port = 3000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    
    # Check/Start HTTP Server
    server_process = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", host],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(1)

    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]

    launched = False
    for browser in chrome_candidates:
        if os.path.exists(browser):
            subprocess.Popen([browser, f"--app={url}", "--window-size=1320,950", "--window-position=40,40"])
            launched = True
            break
            
    if not launched:
        webbrowser.open(url)

    print("Sky Ariana CMR App is running in standalone window.")

if __name__ == "__main__":
    launch_app()
